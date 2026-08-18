"""
Cliente BigQuery com cache em memória.

Autenticação: Application Default Credentials (ADC).
  - Local: gcloud auth application-default login
  - Produção: service account com permissão de leitura no BigQuery
"""

import logging
import threading
from datetime import datetime, timedelta
from typing import Any

from google.cloud import bigquery

from app.config import settings

logger = logging.getLogger(__name__)


class _Cache:
    """Cache em memória com TTL simples (thread-safe)."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, datetime]] = {}
        self._lock = threading.Lock()

    def get(self, key: str, ttl: int) -> Any | None:
        with self._lock:
            entry = self._store.get(key)
            if entry and datetime.now() - entry[1] < timedelta(seconds=ttl):
                return entry[0]
        return None

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._store[key] = (value, datetime.now())

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


_cache = _Cache()
_bq_client: bigquery.Client | None = None
_bq_lock = threading.Lock()


def get_client() -> bigquery.Client:
    global _bq_client
    with _bq_lock:
        if _bq_client is None:
            _bq_client = bigquery.Client(project=settings.GCP_PROJECT)
    return _bq_client


def executar_query(sql: str, cache_key: str | None = None, ttl: int | None = None) -> list[dict]:
    """
    Executa uma query no BigQuery e retorna lista de dicts.
    Se cache_key e ttl forem fornecidos, usa cache em memória.
    """
    ttl = ttl or settings.CACHE_TTL_SEGUNDOS

    if cache_key:
        cached = _cache.get(cache_key, ttl)
        if cached is not None:
            logger.debug("Cache hit: %s", cache_key)
            return cached

    logger.info("BigQuery query: %s", cache_key or sql[:80])
    client = get_client()
    resultado = client.query(sql).result()
    rows = [dict(row) for row in resultado]

    if cache_key:
        _cache.set(cache_key, rows)

    return rows


PROJECT = settings.GCP_PROJECT


# ─── Tabelas-fonte monitoradas ────────────────────────────────────────────────

FONTE_CONFIGS = [
    {
        "nome": "Vitacare - Atendimentos",
        "tabela": "raw_prontuario_vitacare__atendimento",
        "dataset": "brutos_prontuario_vitacare",
        "table_id": "atendimento",
        "cadencia": "diaria",
    },
    {
        "nome": "Vitacare - Procedimentos",
        "tabela": "raw_prontuario_vitacare_historico__procedimentos_clinicos",
        "dataset": "brutos_prontuario_vitacare_historico",
        "table_id": "procedimento_clinico",
        "cadencia": "mensal",
    },
    {
        "nome": "Vitacare - Acto (ponte)",
        "tabela": "raw_prontuario_vitacare_historico__acto",
        "dataset": "brutos_prontuario_vitacare_historico",
        "table_id": "acto",
        "cadencia": "mensal",
    },
    {
        "nome": "Vitacare - Testes Rápidos",
        "tabela": "raw_prontuario_vitacare_historico__testerapido",
        "dataset": "brutos_prontuario_vitacare_historico",
        "table_id": "teste_rapido",
        "cadencia": "mensal",
    },
    {
        "nome": "Vitacare - Pacientes",
        "tabela": "int_prontuario_vitacare__paciente",
        "dataset": "intermediario_prontuario_vitacare",
        "table_id": "paciente",
        "cadencia": "diaria",
    },
    {
        "nome": "Vacinação (CIT/SIPNI)",
        "tabela": "mart_cit__vacinacao",
        "dataset": "registro_vacinal",
        "table_id": "vacinacao",
        "cadencia": "diaria",
    },
    {
        "nome": "Gestações",
        "tabela": "gestacoes",
        "dataset": "projeto_gestacoes",
        "table_id": "gestacoes",
        "cadencia": "diaria",
    },
    {
        "nome": "Histórico Clínico - Episódios",
        "tabela": "mart_historico_clinico__episodio",
        "dataset": "saude_historico_clinico",
        "table_id": "episodio_assistencial",
        "cadencia": "diaria",
    },
]

MODEL_CONFIGS = [
    {
        "modelo": "mart_iplanrio_pic__publico_alvo",
        "dataset": "projeto_pic",
        "table_id": "publico_alvo",
    },
    {
        "modelo": "mart_iplanrio_pic__eventos",
        "dataset": "projeto_pic",
        "table_id": "eventos",
    },
]
