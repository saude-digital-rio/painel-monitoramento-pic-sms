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


@router.get("/cobertura-gestantes")
def get_cobertura_gestantes():
    """Cobertura das 4 condições IST entre gestantes via evidência (teste + diagnóstico)."""
    sql = f"""
        WITH gestantes AS (
            SELECT DISTINCT cpf
            FROM `{PROJECT}.projeto_pic.publico_alvo`
            WHERE tipo_publico = 'Gestacao'
        ),
        evidencias AS (
            SELECT DISTINCT cpf, tipo_evento
            FROM `{PROJECT}.projeto_pic.eventos`
            WHERE tipo_publico = 'Gestacao'
              AND tipo_evento IN (
                  'Teste rápido - HIV',        'Diagnóstico - HIV',
                  'Teste rápido - Sífilis',    'Diagnóstico - Sífilis',
                  'Teste rápido - Hepatite B', 'Diagnóstico - Hepatite B',
                  'Teste rápido - Hepatite C', 'Diagnóstico - Hepatite C'
              )
        ),
        por_cpf AS (
            SELECT
                g.cpf,
                MAX(IF(e.tipo_evento IN ('Teste rápido - HIV',        'Diagnóstico - HIV'),        1, 0)) AS ev_hiv,
                MAX(IF(e.tipo_evento IN ('Teste rápido - Sífilis',    'Diagnóstico - Sífilis'),    1, 0)) AS ev_sifilis,
                MAX(IF(e.tipo_evento IN ('Teste rápido - Hepatite B', 'Diagnóstico - Hepatite B'), 1, 0)) AS ev_hepb,
                MAX(IF(e.tipo_evento IN ('Teste rápido - Hepatite C', 'Diagnóstico - Hepatite C'), 1, 0)) AS ev_hepc,
                MAX(IF(e.tipo_evento = 'Teste rápido - HIV',        1, 0)) AS teste_hiv,
                MAX(IF(e.tipo_evento = 'Teste rápido - Sífilis',    1, 0)) AS teste_sifilis,
                MAX(IF(e.tipo_evento = 'Teste rápido - Hepatite B', 1, 0)) AS teste_hepb,
                MAX(IF(e.tipo_evento = 'Teste rápido - Hepatite C', 1, 0)) AS teste_hepc,
                MAX(IF(e.tipo_evento = 'Diagnóstico - HIV',        1, 0)) AS diag_hiv,
                MAX(IF(e.tipo_evento = 'Diagnóstico - Sífilis',    1, 0)) AS diag_sifilis,
                MAX(IF(e.tipo_evento = 'Diagnóstico - Hepatite B', 1, 0)) AS diag_hepb,
                MAX(IF(e.tipo_evento = 'Diagnóstico - Hepatite C', 1, 0)) AS diag_hepc
            FROM gestantes g
            LEFT JOIN evidencias e ON g.cpf = e.cpf
            GROUP BY g.cpf
        )
        SELECT
            COUNT(*) AS total,
            COUNTIF(ev_hiv + ev_sifilis + ev_hepb + ev_hepc = 0) AS cond_0,
            COUNTIF(ev_hiv + ev_sifilis + ev_hepb + ev_hepc = 1) AS cond_1,
            COUNTIF(ev_hiv + ev_sifilis + ev_hepb + ev_hepc = 2) AS cond_2,
            COUNTIF(ev_hiv + ev_sifilis + ev_hepb + ev_hepc = 3) AS cond_3,
            COUNTIF(ev_hiv + ev_sifilis + ev_hepb + ev_hepc = 4) AS cond_4,
            SUM(ev_hiv)       AS ev_hiv,
            SUM(ev_sifilis)   AS ev_sifilis,
            SUM(ev_hepb)      AS ev_hepb,
            SUM(ev_hepc)      AS ev_hepc,
            SUM(teste_hiv)    AS teste_hiv,
            SUM(teste_sifilis) AS teste_sifilis,
            SUM(teste_hepb)   AS teste_hepb,
            SUM(teste_hepc)   AS teste_hepc,
            SUM(diag_hiv)     AS diag_hiv,
            SUM(diag_sifilis) AS diag_sifilis,
            SUM(diag_hepb)    AS diag_hepb,
            SUM(diag_hepc)    AS diag_hepc
        FROM por_cpf
    """
    rows = executar_query(sql, cache_key="eventos_cobertura_gestantes", ttl=settings.CACHE_TTL_SEGUNDOS)
    if not rows:
        return {}
    r = rows[0]
    total = int(r["total"])

    def pct(n: int) -> float:
        return round(n / total * 100, 1) if total else 0.0

    return {
        "total_gestantes": total,
        "distribuicao_condicoes": [
            {"condicoes": i, "gestantes": int(r[f"cond_{i}"]), "pct": pct(int(r[f"cond_{i}"]))}
            for i in range(5)
        ],
        "evidencia_por_condicao": [
            {"condicao": "HIV",        "com_evidencia": int(r["ev_hiv"]),     "com_teste": int(r["teste_hiv"]),     "com_diagnostico": int(r["diag_hiv"]),     "sem_evidencia": total - int(r["ev_hiv"]),     "pct": pct(int(r["ev_hiv"])),     "pct_teste": pct(int(r["teste_hiv"])),     "pct_diagnostico": pct(int(r["diag_hiv"]))},
            {"condicao": "Sífilis",    "com_evidencia": int(r["ev_sifilis"]), "com_teste": int(r["teste_sifilis"]), "com_diagnostico": int(r["diag_sifilis"]), "sem_evidencia": total - int(r["ev_sifilis"]), "pct": pct(int(r["ev_sifilis"])), "pct_teste": pct(int(r["teste_sifilis"])), "pct_diagnostico": pct(int(r["diag_sifilis"]))},
            {"condicao": "Hepatite B", "com_evidencia": int(r["ev_hepb"]),    "com_teste": int(r["teste_hepb"]),    "com_diagnostico": int(r["diag_hepb"]),    "sem_evidencia": total - int(r["ev_hepb"]),    "pct": pct(int(r["ev_hepb"])),    "pct_teste": pct(int(r["teste_hepb"])),    "pct_diagnostico": pct(int(r["diag_hepb"]))},
            {"condicao": "Hepatite C", "com_evidencia": int(r["ev_hepc"]),    "com_teste": int(r["teste_hepc"]),    "com_diagnostico": int(r["diag_hepc"]),    "sem_evidencia": total - int(r["ev_hepc"]),    "pct": pct(int(r["ev_hepc"])),    "pct_teste": pct(int(r["teste_hepc"])),    "pct_diagnostico": pct(int(r["diag_hepc"]))},
        ],
        "diagnosticos": [
            {"condicao": "HIV",        "com_diagnostico": int(r["diag_hiv"]),     "pct": pct(int(r["diag_hiv"]))},
            {"condicao": "Sífilis",    "com_diagnostico": int(r["diag_sifilis"]), "pct": pct(int(r["diag_sifilis"]))},
            {"condicao": "Hepatite B", "com_diagnostico": int(r["diag_hepb"]),    "pct": pct(int(r["diag_hepb"]))},
            {"condicao": "Hepatite C", "com_diagnostico": int(r["diag_hepc"]),    "pct": pct(int(r["diag_hepc"]))},
        ],
    }


@router.get("/testes-gestantes")
def get_testes_gestantes():
    """Cobertura de testes rápidos entre gestantes: CPFs únicos por tipo de teste."""
    sql = f"""
        WITH gestantes AS (
            SELECT COUNT(DISTINCT cpf) AS total
            FROM `{PROJECT}.projeto_pic.publico_alvo`
            WHERE tipo_publico = 'Gestacao'
        ),
        testes AS (
            SELECT
                tipo_evento,
                COUNT(DISTINCT cpf) AS com_teste
            FROM `{PROJECT}.projeto_pic.eventos`
            WHERE tipo_publico = 'Gestacao'
              AND tipo_evento LIKE 'Teste rápido%'
            GROUP BY tipo_evento
        )
        SELECT
            t.tipo_evento,
            t.com_teste,
            g.total AS total_gestantes,
            ROUND(t.com_teste / NULLIF(g.total, 0) * 100, 1) AS pct
        FROM testes t
        CROSS JOIN gestantes g
    """
    rows = executar_query(sql, cache_key="eventos_testes_gestantes", ttl=settings.CACHE_TTL_SEGUNDOS)
    total = int(rows[0]["total_gestantes"]) if rows else 0
    return {
        "total_gestantes": total,
        "testes": [
            {
                "tipo_evento": r["tipo_evento"],
                "com_teste": int(r["com_teste"]),
                "pct": float(r["pct"] or 0),
            }
            for r in rows
        ],
    }


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
