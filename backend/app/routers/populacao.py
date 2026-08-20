"""
RF-02: Volume da população-alvo
RF-03: Entradas e saídas
RF-04: Janelas temporais
RF-10: Fases de gestação
RF-11: Cobertura do cadastro Vitacare
"""

import logging

from fastapi import APIRouter, Query

from app.config import settings
from app.services.bigquery import PROJECT, executar_query

router = APIRouter(prefix="/populacao", tags=["População-alvo"])
logger = logging.getLogger(__name__)


@router.get("/atual")
def get_populacao_atual():
    """
    Volume atual por segmento + data de referência (última execução do modelo).
    """
    sql = f"""
        SELECT
            tipo_publico,
            COUNT(*) AS total,
            MAX(metadados.ultima_atualizacao) AS ultima_atualizacao
        FROM `{PROJECT}.projeto_pic.publico_alvo`
        GROUP BY tipo_publico
    """
    rows = executar_query(sql, cache_key="pop_atual", ttl=settings.CACHE_TTL_SEGUNDOS)

    total = sum(r["total"] for r in rows)
    por_segmento = {r["tipo_publico"]: int(r["total"]) for r in rows}
    ultima_atualizacao = max(
        (r["ultima_atualizacao"] for r in rows if r.get("ultima_atualizacao")),
        default=None,
    )

    # CPFs em mais de um segmento
    sql_overlap = f"""
        SELECT COUNT(*) AS total
        FROM (
            SELECT cpf, COUNT(DISTINCT tipo_publico) AS n_segmentos
            FROM `{PROJECT}.projeto_pic.publico_alvo`
            GROUP BY cpf
            HAVING n_segmentos > 1
        )
    """
    overlap_rows = executar_query(
        sql_overlap, cache_key="pop_overlap", ttl=settings.CACHE_TTL_SEGUNDOS
    )
    cpf_sobreposicao = int(overlap_rows[0]["total"]) if overlap_rows else 0

    return {
        "gestacao": por_segmento.get("Gestacao", 0),
        "puerperio": por_segmento.get("Puerperio", 0),
        "infancia": por_segmento.get("Infancia", 0),
        "total": total,
        "cpf_sobreposicao": cpf_sobreposicao,
        "data_referencia": ultima_atualizacao.isoformat() if ultima_atualizacao else None,
    }


@router.get("/sobreposicao")
def get_sobreposicao():
    """Lista CPFs presentes em mais de um segmento (gestação, puerpério, infância)."""
    sql = f"""
        SELECT
            cpf,
            ARRAY_AGG(DISTINCT tipo_publico ORDER BY tipo_publico) AS segmentos
        FROM `{PROJECT}.projeto_pic.publico_alvo`
        GROUP BY cpf
        HAVING COUNT(DISTINCT tipo_publico) > 1
        ORDER BY cpf
        LIMIT 500
    """
    rows = executar_query(sql, cache_key="pop_sobreposicao", ttl=settings.CACHE_TTL_SEGUNDOS)
    return rows or []


@router.get("/serie")
def get_serie_populacao(dias: int = Query(default=30, ge=7, le=365)):
    """
    RF-02: Série histórica usando as datas de início das janelas ativas.

    Nota: mart_iplanrio_pic__publico_alvo é uma tabela snapshot (substituída a cada run).
    Esta query usa a data de início (campo `inicio`) como proxy temporal —
    mostra quantas janelas ativas iniciaram a cada dia.
    Para série histórica real, seria necessário uma tabela de auditoria separada.
    """
    sql = f"""
        SELECT
            inicio AS data,
            tipo_publico,
            COUNT(*) AS total
        FROM `{PROJECT}.projeto_pic.publico_alvo`
        WHERE inicio >= DATE_SUB(CURRENT_DATE(), INTERVAL {dias} DAY)
        GROUP BY data, tipo_publico
        ORDER BY data
    """
    rows = executar_query(
        sql, cache_key=f"pop_serie_{dias}", ttl=settings.CACHE_TTL_SEGUNDOS
    )

    # Pivotar por data
    por_data: dict = {}
    for r in rows:
        dt = str(r["data"])
        if dt not in por_data:
            por_data[dt] = {"data": dt, "gestacao": 0, "puerperio": 0, "infancia": 0, "total": 0}
        seg = r["tipo_publico"]
        count = int(r["total"])
        if seg == "Gestacao":
            por_data[dt]["gestacao"] += count
        elif seg == "Puerperio":
            por_data[dt]["puerperio"] += count
        elif seg == "Infancia":
            por_data[dt]["infancia"] += count
        por_data[dt]["total"] += count

    serie = sorted(por_data.values(), key=lambda x: x["data"])
    return serie


@router.get("/janelas")
def get_janelas_temporais():
    """RF-04: Consistência das janelas temporais."""
    sql = f"""
        SELECT
            tipo_publico,
            COUNT(*) AS total,
            COUNTIF(DATE_DIFF(fim, inicio, DAY) <= 0) AS duracao_invalida,
            COUNTIF(
                tipo_publico = 'Gestacao' AND DATE_DIFF(fim, inicio, DAY) > 300
            ) AS acima_300_dias,
            COUNTIF(
                tipo_publico = 'Puerperio' AND DATE_DIFF(fim, inicio, DAY) != 45
            ) AS diferente_45_dias,
            COUNTIF(
                tipo_publico = 'Infancia' AND ABS(DATE_DIFF(fim, inicio, DAY) - 2190) > 10
            ) AS diferente_6_anos,
            ROUND(AVG(DATE_DIFF(fim, inicio, DAY)), 1) AS media_duracao_dias
        FROM `{PROJECT}.projeto_pic.publico_alvo`
        GROUP BY tipo_publico
    """
    rows = executar_query(sql, cache_key="pop_janelas", ttl=settings.CACHE_TTL_SEGUNDOS)

    por_seg = {r["tipo_publico"]: r for r in rows}
    g = por_seg.get("Gestacao", {})
    p = por_seg.get("Puerperio", {})
    i = por_seg.get("Infancia", {})

    return {
        "gestacao": {
            "total": int(g.get("total", 0)),
            "duracao_zero_negativa": int(g.get("duracao_invalida", 0)),
            "acima_300_dias": int(g.get("acima_300_dias", 0)),
            "media_duracao_dias": float(g.get("media_duracao_dias") or 0),
        },
        "puerperio": {
            "total": int(p.get("total", 0)),
            "diferente_45_dias": int(p.get("diferente_45_dias", 0)),
            "media_duracao_dias": float(p.get("media_duracao_dias") or 0),
        },
        "infancia": {
            "total": int(i.get("total", 0)),
            "diferente_6_anos": int(i.get("diferente_6_anos", 0)),
            "media_duracao_dias": float(i.get("media_duracao_dias") or 0),
        },
    }


@router.get("/entradas-saidas")
def get_entradas_saidas(semanas: int = Query(default=12, ge=1, le=52)):
    """
    RF-03: Entradas por segmento agrupadas por semana.

    Entradas: registros cujo campo `inicio` cai na semana.
    Saídas: não disponíveis — publico_alvo é tabela snapshot sem histórico de remoções.
    """
    sql = f"""
        SELECT
            DATE_TRUNC(inicio, WEEK) AS semana,
            tipo_publico AS segmento,
            COUNT(*) AS entradas
        FROM `{PROJECT}.projeto_pic.publico_alvo`
        WHERE inicio >= DATE_SUB(CURRENT_DATE(), INTERVAL {semanas * 7} DAY)
        GROUP BY semana, segmento
        ORDER BY semana, segmento
    """
    rows = executar_query(
        sql, cache_key=f"pop_entradas_{semanas}", ttl=settings.CACHE_TTL_SEGUNDOS
    )

    resultado = [
        {
            "data": str(r["semana"]),
            "segmento": r["segmento"],
            "entradas": int(r["entradas"]),
        }
        for r in rows
    ]
    return resultado


@router.get("/gestacoes")
def get_gestacoes():
    """RF-10: Monitoramento de gestações e puerpério."""
    sql = f"""
        SELECT
            fase_atual,
            COUNT(*) AS total,
            COUNTIF(data_inicio IS NULL) AS data_nula,
            COUNTIF(data_inicio > CURRENT_DATE()) AS data_futura
        FROM `{PROJECT}.projeto_gestacoes.gestacoes`
        WHERE fase_atual IN ('Gestação', 'Puerpério')
        GROUP BY fase_atual
    """
    rows = executar_query(sql, cache_key="gestacoes", ttl=settings.CACHE_TTL_SEGUNDOS)

    # Múltiplas gestações ativas por CPF
    sql_multi = f"""
        SELECT COUNT(*) AS total
        FROM (
            SELECT cpf, COUNT(*) AS n
            FROM `{PROJECT}.projeto_gestacoes.gestacoes`
            WHERE fase_atual = 'Gestação'
            GROUP BY cpf
            HAVING n > 1
        )
    """
    multi_rows = executar_query(sql_multi, cache_key="gestacoes_multi", ttl=settings.CACHE_TTL_SEGUNDOS)

    # Novas gestações na última semana
    sql_novas = f"""
        SELECT COUNT(*) AS total
        FROM `{PROJECT}.projeto_gestacoes.gestacoes`
        WHERE data_inicio >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
            AND fase_atual != 'Encerrada'
    """
    novas_rows = executar_query(sql_novas, cache_key="gestacoes_novas", ttl=settings.CACHE_TTL_SEGUNDOS)

    por_fase = {r["fase_atual"]: r for r in rows}
    g = por_fase.get("Gestação", {})
    p = por_fase.get("Puerpério", {})

    return {
        "gestacoes_ativas": int(g.get("total", 0)),
        "puerperio_ativo": int(p.get("total", 0)),
        "data_nula": int(g.get("data_nula", 0)) + int(p.get("data_nula", 0)),
        "data_futura": int(g.get("data_futura", 0)) + int(p.get("data_futura", 0)),
        "multiplas_gestacoes_ativas": int(multi_rows[0]["total"]) if multi_rows else 0,
        "novas_gestacoes_semana": int(novas_rows[0]["total"]) if novas_rows else 0,
        "encerradas_semana": 0,  # requer consulta com window function — implementar se necessário
    }


@router.get("/cadastro")
def get_cadastro():
    """RF-11: Qualidade do cadastro Vitacare."""
    sql = f"""
        SELECT
            COUNT(*) AS total_pacientes,
            COUNTIF(data_nascimento IS NULL OR data_nascimento < DATE '1900-01-01' OR data_nascimento > CURRENT_DATE()) AS nascimento_invalido,
            COUNTIF(cpf_valido_indicador = FALSE) AS cpf_invalido,
            COUNTIF(cpf IS NULL) AS sem_cpf,
            COUNTIF(cadastro_permanente_indicador = TRUE) AS cadastro_permanente
        FROM `{PROJECT}.intermediario_prontuario_vitacare.paciente`
    """
    rows = executar_query(sql, cache_key="cadastro_qualidade", ttl=settings.CACHE_TTL_SEGUNDOS)
    r = rows[0] if rows else {}

    # Crescimento mensal (cadastros dos últimos 30 dias)
    sql_crescimento = f"""
        SELECT COUNT(*) AS total
        FROM `{PROJECT}.intermediario_prontuario_vitacare.paciente`
        WHERE DATE(data_cadastro_inicial) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    """
    cresc_rows = executar_query(sql_crescimento, cache_key="cadastro_crescimento", ttl=settings.CACHE_TTL_SEGUNDOS)

    return {
        "total_pacientes": int(r.get("total_pacientes", 0)),
        "nascimento_invalido": int(r.get("nascimento_invalido", 0)),
        "cpf_invalido": int(r.get("cpf_invalido", 0)),
        "sem_cpf": int(r.get("sem_cpf", 0)),
        "cadastro_permanente": int(r.get("cadastro_permanente", 0)),
        "crescimento_mensal": int(cresc_rows[0]["total"]) if cresc_rows else 0,
        "criancas_sem_populacao_alvo": None,  # requer JOIN com publico_alvo — custoso
    }
