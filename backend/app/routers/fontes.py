"""
RF-01: Atualização das bases-fonte
RF-09: Execução dos modelos

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
VARIACAO_CRITICO_PCT = 10.0


def _severidade_freshness(horas: float) -> str:
    if horas < LIMITE_AVISO_HORAS:
        return "ok"
    if horas < LIMITE_ALERTA_HORAS:
        return "aviso"
    if horas < LIMITE_CRITICO_HORAS:
        return "alerta"
    return "critico"


def _severidade_volume(variacao_pct: float) -> str:
    if abs(variacao_pct) > VARIACAO_CRITICO_PCT:
        return "critico"
    if abs(variacao_pct) > 5:
        return "alerta"
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


def _buscar_volume_hist_7d(dataset: str, table_id: str) -> float | None:
    """
    Estima média de linhas da semana anterior via partições (INFORMATION_SCHEMA).
    Retorna None se a tabela não for particionada ou não tiver dados.
    """
    sql = f"""
        SELECT
            SUM(total_rows) AS total_rows
        FROM `{PROJECT}.{dataset}.INFORMATION_SCHEMA.PARTITIONS`
        WHERE
            table_name = '{table_id}'
            AND partition_id != '__NULL__'
            AND PARSE_DATE('%Y%m%d', partition_id) BETWEEN
                DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY) AND
                DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    """
    try:
        rows = executar_query(
            sql,
            cache_key=f"vol_hist_{dataset}_{table_id}",
            ttl=settings.CACHE_TTL_METADATA,
        )
        if rows and rows[0].get("total_rows") is not None:
            return float(rows[0]["total_rows"])
    except Exception:
        pass
    return None


def _processar_fonte(cfg: dict, agora: datetime) -> dict:
    """Busca metadata + histórico de uma fonte. Roda em paralelo."""
    meta = _buscar_tabela_metadata(cfg["dataset"], cfg["table_id"])

    if not meta:
        return {
            "nome": cfg["nome"],
            "tabela": cfg["tabela"],
            "dataset": cfg["dataset"],
            "table_id": cfg["table_id"],
            "ultima_atualizacao": None,
            "volume": None,
            "variacao_pct": None,
            "media_7d": None,
            "horas_sem_atualizacao": None,
            "severidade": "alerta",
            "erro": "Tabela não encontrada",
        }

    last_mod: datetime = meta["last_modified_time"]
    if last_mod.tzinfo is None:
        last_mod = last_mod.replace(tzinfo=timezone.utc)

    horas = (agora - last_mod).total_seconds() / 3600
    volume = int(meta.get("row_count") or 0)

    media_7d = _buscar_volume_hist_7d(cfg["dataset"], cfg["table_id"])
    variacao_pct = None
    if media_7d and media_7d > 0:
        variacao_pct = round((volume - media_7d) / media_7d * 100, 2)

    sev_fresh = _severidade_freshness(horas)
    sev_vol = "ok" if variacao_pct is None else _severidade_volume(variacao_pct)
    severidade = _pior_severidade(sev_fresh, sev_vol)

    return {
        "nome": cfg["nome"],
        "tabela": cfg["tabela"],
        "dataset": cfg["dataset"],
        "table_id": cfg["table_id"],
        "ultima_atualizacao": last_mod.isoformat(),
        "volume": volume,
        "variacao_pct": variacao_pct,
        "media_7d": media_7d,
        "horas_sem_atualizacao": round(horas, 1),
        "severidade": severidade,
    }


@router.get("/status")
def get_status_fontes():
    """
    Retorna freshness e volume de cada tabela-fonte monitorada (RF-01).
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
    sql = f"""
        SELECT
            MAX(metadados.ultima_atualizacao) AS ultima_atualizacao,
            COUNT(*) AS volume
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

    return {
        "modelo": cfg["modelo"],
        "ultima_execucao": ultima_exec.isoformat(),
        "intervalo_horas": round(intervalo_horas, 1),
        "volume_atual": volume,
        "severidade": sev,
    }


@router.get("/modelos")
def get_execucoes_modelos():
    """
    RF-09: Acompanha a execução dos modelos de saída (publico_alvo e eventos).
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
