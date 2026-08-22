"""
Usa __TABLES__ do BigQuery para obter row_count e last_modified_time
sem escanear os dados (metadata-only, muito barato).
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter

from app.config import settings
from app.services.bigquery import (
    FONTE_CONFIGS,
    MODEL_CONFIGS,
    PROJECT,
    executar_query,
    get_client,
)

router = APIRouter(prefix="/fontes", tags=["Fontes"])
logger = logging.getLogger(__name__)

LIMITE_AVISO_HORAS = 24
LIMITE_ALERTA_HORAS = 48
LIMITE_CRITICO_HORAS = 72
LIMITE_MENSAL_HORAS = 31 * 24  # 744h — backup mensal esperado
VARIACAO_ALTA_AVISO_PCT = 50.0


def _severidade_freshness(horas: float, cadencia: str = "diaria") -> str:
    if cadencia == "mensal":
        return "ok" if horas < LIMITE_MENSAL_HORAS else "critico"
    if horas < LIMITE_AVISO_HORAS:   # < 24h
        return "ok"
    if horas < LIMITE_CRITICO_HORAS: # 24h–72h
        return "alerta"
    return "critico"


def _severidade_volume(variacao_pct: float) -> str:
    if variacao_pct < -25:
        return "critico"
    if variacao_pct < -15:
        return "alerta"
    if variacao_pct > VARIACAO_ALTA_AVISO_PCT:
        return "aviso"
    return "ok"


def _pior_severidade(a: str, b: str) -> str:
    ordem = {"ok": 0, "aviso": 1, "alerta": 2, "critico": 3}
    return a if ordem[a] >= ordem[b] else b


def _buscar_tabela_metadata(dataset: str, table_id: str) -> dict[str, Any]:
    """Consulta __TABLES__ para obter row_count e last_modified_time."""
    sql = f"""
        SELECT
            table_id,
            row_count,
            TIMESTAMP_MILLIS(last_modified_time) AS last_modified_time,
            size_bytes
        FROM `{PROJECT}.{dataset}.__TABLES__`
        WHERE table_id = '{table_id}'
    """
    rows = executar_query(
        sql,
        cache_key=f"tables_meta_{dataset}_{table_id}",
        ttl=settings.CACHE_TTL_METADATA,
    )
    return rows[0] if rows else {}


def _buscar_volume_particoes(dataset: str, table_id: str, intervalo_inicio: int, intervalo_fim: int) -> float | None:
    """
    Soma total_rows das partições num intervalo de datas via INFORMATION_SCHEMA.
    intervalo_inicio/fim: dias atrás (ex: 7 e 0 = últimos 7 dias; 14 e 7 = semana anterior).
    Retorna None se a tabela não for particionada ou não tiver dados no intervalo.
    """
    if intervalo_fim == 0:
        fim_clause = "CURRENT_DATE()"
    else:
        fim_clause = f"DATE_SUB(CURRENT_DATE(), INTERVAL {intervalo_fim} DAY)"

    sql = f"""
        SELECT
            SUM(total_rows) AS total_rows
        FROM `{PROJECT}.{dataset}.INFORMATION_SCHEMA.PARTITIONS`
        WHERE
            table_name = '{table_id}'
            AND partition_id != '__NULL__'
            AND PARSE_DATE('%Y%m%d', partition_id) BETWEEN
                DATE_SUB(CURRENT_DATE(), INTERVAL {intervalo_inicio} DAY) AND
                {fim_clause}
    """
    try:
        rows = executar_query(
            sql,
            cache_key=f"vol_part_{dataset}_{table_id}_{intervalo_inicio}_{intervalo_fim}",
            ttl=settings.CACHE_TTL_METADATA,
        )
        if rows and rows[0].get("total_rows") is not None:
            return float(rows[0]["total_rows"])
    except Exception:
        pass
    return None


def _severidade_cadastros(variacao_pct: float | None, atual: int, media: float) -> str:
    if atual == 0 and media > 0:
        return "critico"
    if variacao_pct is None:
        return "ok"
    if variacao_pct > -20:
        return "ok"
    if variacao_pct > -30:
        return "aviso"
    if variacao_pct > -50:
        return "alerta"
    return "critico"


def _buscar_cadastros_paciente(dataset: str, table_id: str) -> dict:
    """
    Novos cadastros: semana atual (segunda até hoje) vs média dos mesmos
    períodos nas 4 semanas anteriores. Scan em data_cadastro_inicial apenas.
    """
    sql = f"""
        SELECT
            COUNTIF(
                DATE(data_cadastro_inicial)
                    BETWEEN DATE_TRUNC(CURRENT_DATE(), ISOWEEK) AND CURRENT_DATE()
            ) AS cadastros_semana_atual,
            COUNTIF(
                DATE(data_cadastro_inicial)
                    BETWEEN DATE_SUB(DATE_TRUNC(CURRENT_DATE(), ISOWEEK), INTERVAL 7 DAY)
                        AND DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
            ) AS cadastros_w1,
            COUNTIF(
                DATE(data_cadastro_inicial)
                    BETWEEN DATE_SUB(DATE_TRUNC(CURRENT_DATE(), ISOWEEK), INTERVAL 14 DAY)
                        AND DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
            ) AS cadastros_w2,
            COUNTIF(
                DATE(data_cadastro_inicial)
                    BETWEEN DATE_SUB(DATE_TRUNC(CURRENT_DATE(), ISOWEEK), INTERVAL 21 DAY)
                        AND DATE_SUB(CURRENT_DATE(), INTERVAL 21 DAY)
            ) AS cadastros_w3,
            COUNTIF(
                DATE(data_cadastro_inicial)
                    BETWEEN DATE_SUB(DATE_TRUNC(CURRENT_DATE(), ISOWEEK), INTERVAL 28 DAY)
                        AND DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
            ) AS cadastros_w4
        FROM `{PROJECT}.{dataset}.{table_id}`
    """
    try:
        rows = executar_query(
            sql,
            cache_key=f"cadastros_4sem_{dataset}_{table_id}",
            ttl=settings.CACHE_TTL_METADATA,
        )
        if not rows:
            return {}
        r = rows[0]
        atual = int(r.get("cadastros_semana_atual") or 0)
        w1 = int(r.get("cadastros_w1") or 0)
        w2 = int(r.get("cadastros_w2") or 0)
        w3 = int(r.get("cadastros_w3") or 0)
        w4 = int(r.get("cadastros_w4") or 0)
        media = (w1 + w2 + w3 + w4) / 4
        variacao = round((atual - media) / media * 100, 1) if media > 0 else None
        sev = _severidade_cadastros(variacao, atual, media)
        return {
            "cadastros_semana_atual": atual,
            "media_4_semanas": round(media, 1),
            "variacao_cadastros": variacao,
            "severidade_cadastros": sev,
        }
    except Exception:
        return {}


def _verificar_particoes(dataset: str, table_id: str, granularidade: str = "day") -> dict:
    """
    Detecta anomalias de partição: última partição válida e dias/meses sem nova partição.
    granularidade: "day" (padrão, partition_id = YYYYMMDD) ou "month" (partition_id = YYYYMM).
    Usa agregação pura sem GROUP BY — sempre retorna exatamente 1 linha.
    """
    if granularidade == "month":
        parse_fn = "SAFE.PARSE_DATE('%Y%m%d', CONCAT(partition_id, '01'))"
        current_period = "DATE_TRUNC(CURRENT_DATE(), MONTH)"
        diff_unit = "MONTH"
        diff_alias = "meses_sem_nova_particao"
    else:
        parse_fn = "SAFE.PARSE_DATE('%Y%m%d', partition_id)"
        current_period = "CURRENT_DATE()"
        diff_unit = "DAY"
        diff_alias = "dias_sem_nova_particao"

    sql = f"""
        SELECT
            MAX(CASE
                WHEN {parse_fn} <= {current_period}
                THEN {parse_fn}
                ELSE NULL
            END) AS ultima_particao_valida,
            DATE_DIFF(
                {current_period},
                MAX(CASE
                    WHEN {parse_fn} <= {current_period}
                    THEN {parse_fn}
                    ELSE NULL
                END),
                {diff_unit}
            ) AS {diff_alias},
            COUNTIF(
                {parse_fn} > DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)
            ) AS particoes_futuras,
            SUM(CASE
                WHEN {parse_fn} > DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)
                THEN total_rows ELSE 0
            END) AS registros_anomalos
        FROM `{PROJECT}.{dataset}.INFORMATION_SCHEMA.PARTITIONS`
        WHERE table_name = '{table_id}'
          AND partition_id NOT IN ('__NULL__', '__UNPARTITIONED__')
    """
    try:
        rows = executar_query(
            sql,
            cache_key=f"particoes_{dataset}_{table_id}",
            ttl=settings.CACHE_TTL_METADATA,
        )
        if not rows:
            return {}
        r = rows[0]
        ultima = r.get("ultima_particao_valida")
        futuras = int(r.get("particoes_futuras") or 0)
        anomalos = int(r.get("registros_anomalos") or 0)
        if granularidade == "month":
            meses_raw = r.get("meses_sem_nova_particao")
            meses = int(meses_raw) if meses_raw is not None and ultima is not None else None
            return {
                "ultima_particao_valida": ultima.isoformat() if ultima else None,
                "dias_sem_nova_particao": None,
                "meses_sem_nova_particao": meses,
                "particoes_futuras": futuras,
                "registros_anomalos": anomalos,
            }
        dias_raw = r.get("dias_sem_nova_particao")
        dias = int(dias_raw) if dias_raw is not None and ultima is not None else None
        return {
            "ultima_particao_valida": ultima.isoformat() if ultima else None,
            "dias_sem_nova_particao": dias,
            "meses_sem_nova_particao": None,
            "particoes_futuras": futuras,
            "registros_anomalos": anomalos,
        }
    except Exception:
        return {}


def _severidade_particao(dias: int | None, particoes_futuras: int) -> str:
    if particoes_futuras > 0:
        return "critico"
    if dias is None or dias <= 1:  # ok até 1 dia (equivalente a < 24h para partição diária)
        return "ok"
    if dias <= 3:                  # alerta 2–3 dias (equivalente a 24–72h)
        return "alerta"
    return "critico"


def _severidade_particao_mensal(meses: int | None) -> str:
    if meses is None or meses == 0:
        return "ok"
    if meses == 1:
        return "alerta"
    return "critico"


def _buscar_dado_carregado(dataset: str, table_id: str, campo_loaded_at: str, campo_data_evento: str) -> dict:
    """
    Para fontes onde o campo de partição é a data do evento (não a data de ingestão):
    retorna o último loaded_at (ingestão real) e a data mais recente do evento,
    excluindo partições futuras.
    Faz scan de dados — usar TTL_SEGUNDOS.
    """
    sql = f"""
        SELECT
            MAX({campo_loaded_at}) AS ultimo_dado_carregado,
            MAX({campo_data_evento}) AS ultima_data_atendimento
        FROM `{PROJECT}.{dataset}.{table_id}`
        WHERE {campo_data_evento} <= CURRENT_DATE('America/Sao_Paulo')
    """
    try:
        rows = executar_query(
            sql,
            cache_key=f"dado_carregado_{dataset}_{table_id}",
            ttl=settings.CACHE_TTL_SEGUNDOS,
        )
        if not rows:
            return {}
        r = rows[0]
        return {
            "ultimo_dado_carregado": r.get("ultimo_dado_carregado"),
            "ultima_data_atendimento": r.get("ultima_data_atendimento"),
        }
    except Exception:
        return {}


def _buscar_volume_por_origem(dataset: str, table_id: str) -> dict[str, int] | None:
    """
    Para tabelas consolidadas: retorna volume por valor do campo `origem`.
    Faz scan completo — usar cache longo.
    """
    sql = f"""
        SELECT origem, COUNT(*) AS volume
        FROM `{PROJECT}.{dataset}.{table_id}`
        GROUP BY origem
    """
    try:
        rows = executar_query(
            sql,
            cache_key=f"vol_origem_{dataset}_{table_id}",
            ttl=settings.CACHE_TTL_METADATA,
        )
        return {r["origem"]: int(r["volume"]) for r in rows if r.get("origem")}
    except Exception:
        return None


def _processar_fonte(cfg: dict, agora: datetime) -> dict:
    """Busca metadata + histórico de uma fonte. Roda em paralelo."""
    cadencia = cfg.get("cadencia", "diaria")
    meta = _buscar_tabela_metadata(cfg["dataset"], cfg["table_id"])

    if not meta:
        return {
            "nome": cfg["nome"],
            "tabela": cfg["tabela"],
            "dataset": cfg["dataset"],
            "table_id": cfg["table_id"],
            "cadencia": cadencia,
            "tipo": cfg.get("tipo", "padrao"),
            "ultima_atualizacao": None,
            "volume": None,
            "volume_atual_7d": None,
            "variacao_pct": None,
            "media_4_semanas": None,
            "volume_por_origem": None,
            "horas_sem_atualizacao": None,
            "ultima_particao_valida": None,
            "dias_sem_nova_particao": None,
            "meses_sem_nova_particao": None,
            "particoes_futuras": None,
            "registros_anomalos": None,
            "severidade_particao": None,
            "ultimo_dado_carregado": None,
            "horas_sem_dado_carregado": None,
            "ultima_data_atendimento": None,
            "label_data_evento": None,
            "severidade_ingestao": None,
            "severidade": "alerta",
            "erro": "Tabela não encontrada",
        }

    last_mod: datetime = meta["last_modified_time"]
    if last_mod.tzinfo is None:
        last_mod = last_mod.replace(tzinfo=timezone.utc)

    horas = (agora - last_mod).total_seconds() / 3600
    volume = int(meta.get("row_count") or 0)

    sev_fresh = _severidade_freshness(horas, cadencia)
    tipo = cfg.get("tipo", "padrao")

    extra: dict = {}

    # Variáveis de partição e ingestão — preenchidas apenas no branch padrão
    ultima_particao_valida = None
    dias_sem_nova_particao = None
    meses_sem_nova_particao = None
    particoes_futuras = None
    registros_anomalos = None
    severidade_particao = None
    ultimo_dado_carregado = None
    horas_sem_dado_carregado = None
    ultima_data_atendimento = None
    label_data_evento = None
    severidade_ingestao = None

    if tipo == "consolidada":
        volume_atual_7d = None
        media_4_semanas = None
        variacao_pct = None
        volume_por_origem = _buscar_volume_por_origem(cfg["dataset"], cfg["table_id"])
        severidade = sev_fresh
    elif tipo == "paciente":
        volume_atual_7d = None
        media_4_semanas = None
        variacao_pct = None
        volume_por_origem = None
        extra = _buscar_cadastros_paciente(cfg["dataset"], cfg["table_id"])
        sev_cad = extra.get("severidade_cadastros", "ok")
        severidade = _pior_severidade(sev_fresh, sev_cad)
    elif cadencia == "mensal":
        volume_atual_7d = None
        media_4_semanas = None
        variacao_pct = None
        volume_por_origem = None
        severidade = sev_fresh
    else:
        # Volume: atual (d-6 a d0) vs média das 4 semanas anteriores
        volume_atual_7d = _buscar_volume_particoes(cfg["dataset"], cfg["table_id"], 6, 0)
        volume_w1 = _buscar_volume_particoes(cfg["dataset"], cfg["table_id"], 13, 7)
        volume_w2 = _buscar_volume_particoes(cfg["dataset"], cfg["table_id"], 20, 14)
        volume_w3 = _buscar_volume_particoes(cfg["dataset"], cfg["table_id"], 27, 21)
        volume_w4 = _buscar_volume_particoes(cfg["dataset"], cfg["table_id"], 34, 28)
        variacao_pct = None
        media_4_semanas = None
        volume_por_origem = None
        semanas = [volume_w1, volume_w2, volume_w3, volume_w4]
        if all(v is not None for v in semanas):
            media_4_semanas = sum(semanas) / 4
            if volume_atual_7d is not None and media_4_semanas > 0:
                variacao_pct = round((volume_atual_7d - media_4_semanas) / media_4_semanas * 100, 2)
        sev_vol = "ok" if variacao_pct is None else _severidade_volume(variacao_pct)

        # Partições: detecta datas futuras que bloqueiam incrementais
        particao_gran = cfg.get("particao_granularidade", "day")
        info_part = _verificar_particoes(cfg["dataset"], cfg["table_id"], particao_gran)
        ultima_particao_valida = info_part.get("ultima_particao_valida")
        dias_sem_nova_particao = info_part.get("dias_sem_nova_particao")
        meses_sem_nova_particao = info_part.get("meses_sem_nova_particao")
        particoes_futuras = info_part.get("particoes_futuras", 0)
        registros_anomalos = info_part.get("registros_anomalos")
        if particao_gran == "month":
            sev_part = _severidade_particao_mensal(meses_sem_nova_particao)
        else:
            sev_part = _severidade_particao(dias_sem_nova_particao, particoes_futuras)
        severidade_particao = sev_part

        # Ingestão real: para fontes onde partição ≠ data de carga (ex: teste_rapido)
        campo_loaded_at = cfg.get("campo_loaded_at")
        if campo_loaded_at:
            campo_data_evento = cfg.get("campo_data_evento", campo_loaded_at)
            label_data_evento = cfg.get("label_data_evento", "Último evento")
            info_dado = _buscar_dado_carregado(
                cfg["dataset"], cfg["table_id"], campo_loaded_at, campo_data_evento
            )
            dt_carregado = info_dado.get("ultimo_dado_carregado")
            if dt_carregado:
                if dt_carregado.tzinfo is None:
                    dt_carregado = dt_carregado.replace(tzinfo=timezone.utc)
                horas_sem_dado_carregado = round((agora - dt_carregado).total_seconds() / 3600, 1)
                ultimo_dado_carregado = dt_carregado.isoformat()
            data_atend = info_dado.get("ultima_data_atendimento")
            ultima_data_atendimento = data_atend.isoformat() if data_atend else None
            sev_ingestao = _severidade_freshness(horas_sem_dado_carregado or 999.0, cadencia)
            severidade_ingestao = sev_ingestao
        else:
            sev_ingestao = "ok"

        severidade = _pior_severidade(
            _pior_severidade(_pior_severidade(sev_fresh, sev_vol), sev_part),
            sev_ingestao,
        )

    return {
        "nome": cfg["nome"],
        "tabela": cfg["tabela"],
        "dataset": cfg["dataset"],
        "table_id": cfg["table_id"],
        "cadencia": cadencia,
        "tipo": tipo,
        "ultima_atualizacao": last_mod.isoformat(),
        "volume": volume,
        "volume_atual_7d": int(volume_atual_7d) if volume_atual_7d is not None else None,
        "variacao_pct": variacao_pct,
        "media_4_semanas": round(media_4_semanas) if media_4_semanas is not None else None,
        "volume_por_origem": volume_por_origem,
        "horas_sem_atualizacao": round(horas, 1),
        "ultima_particao_valida": ultima_particao_valida,
        "dias_sem_nova_particao": dias_sem_nova_particao,
        "meses_sem_nova_particao": meses_sem_nova_particao,
        "particoes_futuras": particoes_futuras,
        "registros_anomalos": registros_anomalos,
        "severidade_particao": severidade_particao,
        "ultimo_dado_carregado": ultimo_dado_carregado,
        "horas_sem_dado_carregado": horas_sem_dado_carregado,
        "ultima_data_atendimento": ultima_data_atendimento,
        "label_data_evento": label_data_evento,
        "severidade_ingestao": severidade_ingestao,
        "severidade": severidade,
        **extra,
    }


@router.get("/historico")
def get_historico_volume(dataset: str, table_id: str, dias: int = 30):
    """
    Retorna o volume diário de uma tabela particionada via INFORMATION_SCHEMA.PARTITIONS.
    Custo zero — metadata only.
    """
    sql = f"""
        SELECT
            PARSE_DATE('%Y%m%d', partition_id) AS data,
            SUM(total_rows) AS volume
        FROM `{PROJECT}.{dataset}.INFORMATION_SCHEMA.PARTITIONS`
        WHERE
            table_name = '{table_id}'
            AND partition_id != '__NULL__'
            AND PARSE_DATE('%Y%m%d', partition_id) >= DATE_SUB(CURRENT_DATE(), INTERVAL {dias} DAY)
        GROUP BY 1
        ORDER BY 1
    """
    rows = executar_query(
        sql,
        cache_key=f"historico_{dataset}_{table_id}_{dias}",
        ttl=settings.CACHE_TTL_METADATA,
    )
    return [{"data": str(r["data"]), "volume": int(r["volume"] or 0)} for r in rows]


@router.get("/status")
def get_status_fontes():
    """
    Retorna freshness e volume de cada tabela-fonte monitorada.
    Usa __TABLES__ — sem custo de escaneamento de dados.
    Todas as fontes são consultadas em paralelo.
    """
    agora = datetime.now(tz=timezone.utc)
    resultado: list[dict] = [{}] * len(FONTE_CONFIGS)

    with ThreadPoolExecutor(max_workers=len(FONTE_CONFIGS)) as pool:
        futures = {
            pool.submit(_processar_fonte, cfg, agora): i
            for i, cfg in enumerate(FONTE_CONFIGS)
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                resultado[idx] = future.result()
            except Exception:
                cfg = FONTE_CONFIGS[idx]
                logger.exception("Erro ao processar fonte: %s", cfg["tabela"])
                resultado[idx] = {
                    "nome": cfg["nome"],
                    "tabela": cfg["tabela"],
                    "dataset": cfg["dataset"],
                    "table_id": cfg["table_id"],
                    "cadencia": cfg.get("cadencia", "diaria"),
                    "ultima_atualizacao": None,
                    "volume": None,
                    "variacao_pct": None,
                    "media_4_semanas": None,
                    "horas_sem_atualizacao": None,
                    "ultima_particao_valida": None,
                    "dias_sem_nova_particao": None,
                    "meses_sem_nova_particao": None,
                    "particoes_futuras": None,
                    "registros_anomalos": None,
                    "severidade_particao": None,
                    "ultimo_dado_carregado": None,
                    "horas_sem_dado_carregado": None,
                    "ultima_data_atendimento": None,
                    "label_data_evento": None,
                    "severidade_ingestao": None,
                    "severidade": "alerta",
                    "erro": "Erro ao consultar",
                }

    return resultado


def _processar_modelo(cfg: dict) -> dict:
    """Consulta metadata de um modelo dbt. Roda em paralelo."""
    tabela = f"`{PROJECT}.{cfg['dataset']}.{cfg['table_id']}`"
    campo_data = cfg.get("campo_data")

    if "sql_override" in cfg:
        sql = cfg["sql_override"].format(PROJECT=PROJECT)
    else:
        max_data_clause = f", MAX({campo_data}) AS ultimo_dado" if campo_data else ""
        sql = f"""
            SELECT
                MAX(metadados.ultima_atualizacao) AS ultima_atualizacao,
                COUNT(*) AS volume
                {max_data_clause}
            FROM {tabela}
        """
    rows = executar_query(
        sql,
        cache_key=f"modelo_{cfg['table_id']}",
        ttl=settings.CACHE_TTL_SEGUNDOS,
    )

    if not rows or not rows[0].get("ultima_atualizacao"):
        return {
            "modelo": cfg["modelo"],
            "ultima_execucao": None,
            "ultimo_dado": None,
            "volume_atual": 0,
            "severidade": "alerta",
            "erro": "Sem dados",
        }

    ultima_exec: datetime = rows[0]["ultima_atualizacao"]
    if ultima_exec.tzinfo is None:
        ultima_exec = ultima_exec.replace(tzinfo=timezone.utc)

    agora = datetime.now(tz=timezone.utc)
    intervalo_horas = (agora - ultima_exec).total_seconds() / 3600
    volume = int(rows[0]["volume"])
    sev = "critico" if intervalo_horas > 25 else "ok"

    ultimo_dado = rows[0].get("ultimo_dado")
    ultimo_dado_iso = ultimo_dado.isoformat() if ultimo_dado is not None else None

    return {
        "modelo": cfg["modelo"],
        "ultima_execucao": ultima_exec.isoformat(),
        "intervalo_horas": round(intervalo_horas, 1),
        "volume_atual": volume,
        "ultimo_dado": ultimo_dado_iso,
        "label_ultimo_dado": cfg.get("label_ultimo_dado", "Último dado disponível"),
        "severidade": sev,
    }


@router.get("/modelos")
def get_execucoes_modelos():
    """
    Acompanha a execução dos modelos de saída (publico_alvo e eventos).
    Usa metadados.ultima_atualizacao embutido nos modelos dbt.
    Todos os modelos são consultados em paralelo.
    """
    resultado: list[dict] = [{}] * len(MODEL_CONFIGS)

    with ThreadPoolExecutor(max_workers=len(MODEL_CONFIGS)) as pool:
        futures = {
            pool.submit(_processar_modelo, cfg): i
            for i, cfg in enumerate(MODEL_CONFIGS)
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                resultado[idx] = future.result()
            except Exception:
                cfg = MODEL_CONFIGS[idx]
                logger.exception("Erro ao processar modelo: %s", cfg["modelo"])
                resultado[idx] = {
                    "modelo": cfg["modelo"],
                    "ultima_execucao": None,
                    "volume_atual": 0,
                    "severidade": "alerta",
                    "erro": "Erro ao consultar",
                }

    return resultado
