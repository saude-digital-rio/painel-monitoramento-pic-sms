"""
Rotas de eventos: volume, cobertura, consistência de datas, compatibilidade e completude.
"""

import logging

from fastapi import APIRouter, Query

from app.config import settings
from app.services.bigquery import PROJECT, executar_query

router = APIRouter(prefix="/eventos", tags=["Eventos"])
logger = logging.getLogger(__name__)


@router.get("/serie")
def get_serie_eventos(dias: int = Query(default=30, ge=7, le=365)):
    """
    Série histórica de eventos por tipo.
    Query na tabela mart_iplanrio_pic__eventos filtrada por data_evento.
    """
    sql = f"""
        SELECT
            data_evento AS data,
            COUNTIF(tipo_evento = 'Consulta') AS consulta,
            COUNTIF(tipo_evento = 'Visita Domiciliar') AS visita,
            COUNTIF(tipo_evento = 'Teste rápido - HIV') AS teste_hiv,
            COUNTIF(tipo_evento = 'Teste rápido - Sífilis') AS teste_sifilis,
            COUNTIF(tipo_evento = 'Teste rápido - Hepatite B') AS teste_hepb,
            COUNTIF(tipo_evento = 'Teste rápido - Hepatite C') AS teste_hepc,
            COUNTIF(tipo_evento = 'Vacina - Pentavalente - D3') AS vacina_d3,
            COUNTIF(tipo_evento LIKE 'Diagnóstico%') AS diagnostico
        FROM `{PROJECT}.projeto_pic.eventos`
        WHERE
            data_evento >= DATE_SUB(CURRENT_DATE(), INTERVAL {dias} DAY)
            AND data_evento <= CURRENT_DATE()
        GROUP BY data_evento
        ORDER BY data_evento
    """
    rows = executar_query(
        sql, cache_key=f"eventos_serie_{dias}", ttl=settings.CACHE_TTL_SEGUNDOS
    )
    return [
        {
            "data": str(r["data"]),
            "consulta": int(r["consulta"]),
            "visita": int(r["visita"]),
            "teste_hiv": int(r["teste_hiv"]),
            "teste_sifilis": int(r["teste_sifilis"]),
            "teste_hepb": int(r["teste_hepb"]),
            "teste_hepc": int(r["teste_hepc"]),
            "vacina_d3": int(r["vacina_d3"]),
            "diagnostico": int(r["diagnostico"]),
        }
        for r in rows
    ]


@router.get("/cobertura")
def get_cobertura():
    """Cobertura — população com pelo menos um evento."""
    sql = f"""
        WITH publico AS (
            SELECT tipo_publico, cpf
            FROM `{PROJECT}.projeto_pic.publico_alvo`
        ),
        com_evento AS (
            SELECT DISTINCT tipo_publico, cpf
            FROM `{PROJECT}.projeto_pic.eventos`
        )
        SELECT
            p.tipo_publico,
            COUNT(p.cpf) AS total,
            COUNT(e.cpf) AS com_evento,
            COUNT(p.cpf) - COUNT(e.cpf) AS sem_evento,
            ROUND(COUNT(e.cpf) / COUNT(p.cpf) * 100, 1) AS cobertura_pct
        FROM publico p
        LEFT JOIN com_evento e USING (tipo_publico, cpf)
        GROUP BY p.tipo_publico
    """
    rows = executar_query(sql, cache_key="eventos_cobertura", ttl=settings.CACHE_TTL_SEGUNDOS)
    return [
        {
            "segmento": r["tipo_publico"],
            "total": int(r["total"]),
            "com_evento": int(r["com_evento"]),
            "sem_evento": int(r["sem_evento"]),
            "cobertura_pct": float(r["cobertura_pct"] or 0),
        }
        for r in rows
    ]


def _get_eventos_counters() -> dict:
    """Uma única varredura de projeto_pic.eventos retorna todos os contadores escalares
    usados por /consistencia-datas e /completude, evitando dois full-scans separados."""
    sql = f"""
        SELECT
            COUNTIF(data_evento > CURRENT_DATE()) AS eventos_futuro,
            COUNTIF(data_evento < DATE '2000-01-01') AS eventos_outlier_passado,
            COUNTIF(distancia_dias IS NULL) AS distancia_dias_nula,
            COUNTIF(distancia_dias < 0) AS distancia_dias_negativa,
            COUNTIF(inicio_fase IS NULL) AS inicio_fase_nulo,
            COUNTIF(
                data_evento IS NOT NULL
                AND inicio_fase IS NOT NULL
                AND fim_fase IS NOT NULL
                AND (data_evento < inicio_fase OR data_evento > fim_fase)
            ) AS eventos_fora_janela,
            COUNTIF(tipo_publico IS NULL) AS tipo_publico_nulo,
            COUNTIF(tipo_evento IS NULL) AS tipo_evento_nulo,
            COUNTIF(data_evento IS NULL) AS data_evento_nula,
            COUNTIF(cpf IS NULL) AS cpf_nulo
        FROM `{PROJECT}.projeto_pic.eventos`
    """
    rows = executar_query(sql, cache_key="eventos_counters", ttl=settings.CACHE_TTL_SEGUNDOS)
    return rows[0] if rows else {}


@router.get("/consistencia-datas")
def get_consistencia_datas():
    """Consistência das datas dos eventos."""
    r = _get_eventos_counters()
    return {
        "eventos_futuro": int(r.get("eventos_futuro", 0)),
        "eventos_outlier_passado": int(r.get("eventos_outlier_passado", 0)),
        "distancia_dias_nula": int(r.get("distancia_dias_nula", 0)),
        "distancia_dias_negativa": int(r.get("distancia_dias_negativa", 0)),
        "inicio_fase_nulo": int(r.get("inicio_fase_nulo", 0)),
        "eventos_fora_janela": int(r.get("eventos_fora_janela", 0)),
    }


@router.get("/evento-segmento")
def get_evento_segmento():
    """Cruzamento tipo_evento × tipo_publico com flag de incompatibilidade."""
    # Combinações incompatíveis conhecidas
    INCOMPATIVEIS = {
        ("Teste rápido - HIV", "Infancia"),
        ("Teste rápido - Sífilis", "Infancia"),
        ("Teste rápido - Hepatite B", "Infancia"),
        ("Teste rápido - Hepatite C", "Infancia"),
        ("Vacina - Pentavalente - D3", "Gestacao"),
        ("Vacina - Pentavalente - D3", "Puerperio"),
    }
    sql = f"""
        SELECT
            tipo_evento,
            tipo_publico,
            COUNT(*) AS count
        FROM `{PROJECT}.projeto_pic.eventos`
        GROUP BY tipo_evento, tipo_publico
        ORDER BY count DESC
    """
    rows = executar_query(sql, cache_key="eventos_segmento", ttl=settings.CACHE_TTL_SEGUNDOS)
    return [
        {
            "tipo_evento": r["tipo_evento"],
            "tipo_publico": r["tipo_publico"],
            "count": int(r["count"]),
            "compativel": (r["tipo_evento"], r["tipo_publico"]) not in INCOMPATIVEIS,
        }
        for r in rows
    ]


@router.get("/completude")
def get_completude():
    """Completude dos campos transmitidos."""
    r = _get_eventos_counters()
    return {
        "tipo_publico_nulo": int(r.get("tipo_publico_nulo", 0)),
        "tipo_evento_nulo": int(r.get("tipo_evento_nulo", 0)),
        "data_evento_nula": int(r.get("data_evento_nula", 0)),
        "cpf_nulo": int(r.get("cpf_nulo", 0)),
        "distancia_dias_nula": int(r.get("distancia_dias_nula", 0)),
        "distancia_dias_negativa": int(r.get("distancia_dias_negativa", 0)),
        "inicio_fase_nulo": int(r.get("inicio_fase_nulo", 0)),
    }
