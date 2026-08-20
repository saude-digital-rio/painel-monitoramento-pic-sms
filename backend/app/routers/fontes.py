"""
Usa __TABLES__ do BigQuery para obter row_count e last_modified_time
sem escanear os dados (metadata-only, muito barato).
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
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
VARIACAO_CRITICO_PCT = 10.0
VARIACAO_ALTA_AVISO_PCT = 50.0


def _severidade_freshness(horas: float, cadencia: str = "diaria") -> str:
    if cadencia == "mensal":
        return "ok" if horas < LIMITE_MENSAL_HORAS else "critico"
    if horas < LIMITE_AVISO_HORAS:
        return "ok"
    if horas < LIMITE_ALERTA_HORAS:
        return "aviso"
    if horas < LIMITE_CRITICO_HORAS:
        return "alerta"
    return "critico"


def _severidade_volume(variacao_pct: float) -> str:
    if variacao_pct < -VARIACAO_CRITICO_PCT:
        return "critico"
    if variacao_pct < -5:
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
            "media_7d": None,
            "volume_por_origem": None,
            "horas_sem_atualizacao": None,
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

    if tipo == "consolidada":
        # Tabela consolidada: severidade só pelo freshness, volume por origem via query.
        volume_atual_7d = None
        media_7d = None
        variacao_pct = None
        volume_por_origem = _buscar_volume_por_origem(cfg["dataset"], cfg["table_id"])
        severidade = sev_fresh
    elif cadencia == "mensal":
        # Backup mensal com substituição: não há carga anterior disponível para comparar.
        volume_atual_7d = None
        media_7d = None
        variacao_pct = None
        volume_por_origem = None
        severidade = sev_fresh
    else:
        volume_atual_7d = _buscar_volume_particoes(cfg["dataset"], cfg["table_id"], 7, 0)
        media_7d = _buscar_volume_particoes(cfg["dataset"], cfg["table_id"], 14, 7)
        variacao_pct = None
        volume_por_origem = None
        volume_comparacao = volume_atual_7d if volume_atual_7d is not None else volume
        if media_7d and media_7d > 0:
            variacao_pct = round((volume_comparacao - media_7d) / media_7d * 100, 2)
        sev_vol = "ok" if variacao_pct is None else _severidade_volume(variacao_pct)
        severidade = _pior_severidade(sev_fresh, sev_vol)

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
        "media_7d": media_7d,
        "volume_por_origem": volume_por_origem,
        "horas_sem_atualizacao": round(horas, 1),
        "severidade": severidade,
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
                    "media_7d": None,
                    "horas_sem_atualizacao": None,
                    "severidade": "alerta",
                    "erro": "Erro ao consultar",
                }

    return resultado


def _processar_modelo(cfg: dict) -> dict:
    """Consulta metadata de um modelo dbt. Roda em paralelo."""
    campo_data = cfg.get("campo_data")
    max_data_clause = f", MAX({campo_data}) AS ultimo_dado" if campo_data else ""

    sql = f"""
        SELECT
            MAX(metadados.ultima_atualizacao) AS ultima_atualizacao,
            COUNT(*) AS volume
            {max_data_clause}
        FROM `{PROJECT}.{cfg["dataset"]}.{cfg["table_id"]}`
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
