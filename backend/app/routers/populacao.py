"""
Rotas de população-alvo: volume por segmento, janelas temporais, gestações e qualidade cadastral.
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
    Série histórica usando as datas de início das janelas ativas.

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


@router.get("/consistencia")
def get_consistencia_populacao():
    """CPFs em múltiplos segmentos, sobreposição tripla e taxa de sobreposição."""
    sql_combinacoes = f"""
        WITH
        gest  AS (SELECT cpf FROM `{PROJECT}.projeto_pic.publico_alvo` WHERE tipo_publico = 'Gestacao'),
        puer  AS (SELECT cpf FROM `{PROJECT}.projeto_pic.publico_alvo` WHERE tipo_publico = 'Puerperio'),
        infan AS (SELECT cpf FROM `{PROJECT}.projeto_pic.publico_alvo` WHERE tipo_publico = 'Infancia')
        SELECT segmentos, COUNT(*) AS quantidade_cpfs
        FROM (
            SELECT 'Gestacao + Infancia'  AS segmentos FROM gest  JOIN infan USING (cpf)
            UNION ALL
            SELECT 'Gestacao + Puerperio'             FROM gest  JOIN puer  USING (cpf)
            UNION ALL
            SELECT 'Infancia + Puerperio'             FROM infan JOIN puer  USING (cpf)
        )
        GROUP BY segmentos
        HAVING COUNT(*) > 0
        ORDER BY quantidade_cpfs DESC
    """
    sql_scalars = f"""
        WITH
        gest  AS (SELECT cpf FROM `{PROJECT}.projeto_pic.publico_alvo` WHERE tipo_publico = 'Gestacao'),
        puer  AS (SELECT cpf FROM `{PROJECT}.projeto_pic.publico_alvo` WHERE tipo_publico = 'Puerperio'),
        infan AS (SELECT cpf FROM `{PROJECT}.projeto_pic.publico_alvo` WHERE tipo_publico = 'Infancia')
        SELECT
            (SELECT COUNT(DISTINCT cpf) FROM `{PROJECT}.projeto_pic.publico_alvo`) AS total_cpfs,
            (SELECT COUNT(*) FROM gest JOIN puer USING (cpf) JOIN infan USING (cpf)) AS cpfs_tres_segmentos
    """

    rows = executar_query(sql_combinacoes, cache_key="pop_consistencia", ttl=settings.CACHE_TTL_SEGUNDOS)
    scalars = executar_query(sql_scalars, cache_key="pop_consistencia_scalars", ttl=settings.CACHE_TTL_SEGUNDOS)

    sc = scalars[0] if scalars else {}
    total_cpfs = int(sc.get("total_cpfs") or 0)
    cpfs_tres_segmentos = int(sc.get("cpfs_tres_segmentos") or 0)
    total_multiplos = sum(int(r["quantidade_cpfs"]) for r in rows)
    taxa_sobreposicao = round(total_multiplos / total_cpfs * 100, 2) if total_cpfs > 0 else 0.0

    return {
        "cpfs_multiplos_segmentos": total_multiplos,
        "cpfs_tres_segmentos": cpfs_tres_segmentos,
        "taxa_sobreposicao": taxa_sobreposicao,
        "total_cpfs": total_cpfs,
        "duplicidades_mesmo_segmento": 0,
        "combinacoes": [
            {"segmentos": r["segmentos"], "quantidade_cpfs": int(r["quantidade_cpfs"])}
            for r in rows
        ],
    }


@router.get("/entradas-saidas")
def get_entradas_saidas(semanas: int = Query(default=12, ge=1, le=52)):
    """
    Entradas por segmento agrupadas por semana.

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
    """Monitoramento de gestações e puerpério."""
    sql = f"""
        WITH base AS (
            SELECT fase_atual, data_fim, dpp, equipe_nome, cpf
            FROM `{PROJECT}.projeto_gestacoes.gestacoes`
        ),
        contagens AS (
            SELECT
                COUNTIF(fase_atual = 'Gestação')  AS gestacoes_ativas,
                COUNTIF(fase_atual = 'Puerpério') AS puerperio_ativo,
                COUNTIF(fase_atual = 'Encerrada' AND data_fim IS NULL)
                    AS encerradas_sem_fechamento,
                COUNTIF(fase_atual = 'Gestação' AND dpp < CURRENT_DATE())
                    AS ativas_dpp_ultrapassada,
                COUNTIF(fase_atual IN ('Gestação', 'Puerpério') AND equipe_nome IS NULL)
                    AS sem_equipe
            FROM base
        ),
        multiplas AS (
            SELECT COUNT(*) AS multiplas_gestacoes_ativas
            FROM (
                SELECT cpf
                FROM base
                WHERE fase_atual = 'Gestação'
                GROUP BY cpf
                HAVING COUNT(*) > 1
            )
        )
        SELECT c.*, m.multiplas_gestacoes_ativas
        FROM contagens c, multiplas m
    """
    rows = executar_query(sql, cache_key="gestacoes", ttl=settings.CACHE_TTL_SEGUNDOS)
    r = rows[0] if rows else {}

    return {
        "gestacoes_ativas": int(r.get("gestacoes_ativas") or 0),
        "puerperio_ativo": int(r.get("puerperio_ativo") or 0),
        "encerradas_sem_fechamento": int(r.get("encerradas_sem_fechamento") or 0),
        "ativas_dpp_ultrapassada": int(r.get("ativas_dpp_ultrapassada") or 0),
        "multiplas_gestacoes_ativas": int(r.get("multiplas_gestacoes_ativas") or 0),
        "sem_equipe": int(r.get("sem_equipe") or 0),
    }


@router.get("/perfil-infancia")
def get_perfil_infancia():
    """
    Perfil da população infantil (< 6 anos):
    - distribuição por faixa etária (0-1, 1-2, 2-4, 4-6)
    - crianças que completam 6 anos nos próximos 30 dias
    - nascimentos nos últimos 30 dias (data_nascimento, não data de cadastro)
    - crianças < 6 anos sem CPF (camada raw, antes do filtro cpf IS NOT NULL)
    """
    # Faixas etárias + próximas saídas + nascimentos — intermediario (cpf != NULL)
    sql_int = f"""
        SELECT
            COUNTIF(
                DATE_ADD(data_nascimento, INTERVAL 1 YEAR) > CURRENT_DATE()
            ) AS faixa_0_1,
            COUNTIF(
                DATE_ADD(data_nascimento, INTERVAL 1 YEAR) <= CURRENT_DATE()
                AND DATE_ADD(data_nascimento, INTERVAL 2 YEAR) > CURRENT_DATE()
            ) AS faixa_1_2,
            COUNTIF(
                DATE_ADD(data_nascimento, INTERVAL 2 YEAR) <= CURRENT_DATE()
                AND DATE_ADD(data_nascimento, INTERVAL 4 YEAR) > CURRENT_DATE()
            ) AS faixa_2_4,
            COUNTIF(
                DATE_ADD(data_nascimento, INTERVAL 4 YEAR) <= CURRENT_DATE()
            ) AS faixa_4_6,
            COUNTIF(
                DATE_ADD(data_nascimento, INTERVAL 6 YEAR)
                    BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY)
            ) AS completam_6_anos_30d,
            COUNTIF(
                data_nascimento >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            ) AS nascimentos_30d
        FROM `{PROJECT}.intermediario_prontuario_vitacare.paciente`
        WHERE data_nascimento > DATE_SUB(CURRENT_DATE(), INTERVAL 6 YEAR)
    """
    # Crianças < 6 anos sem CPF — camada raw (antes do filtro cpf IS NOT NULL)
    sql_sem_cpf = f"""
        SELECT COUNT(DISTINCT id_paciente_global) AS sem_cpf
        FROM `{PROJECT}.brutos_prontuario_vitacare.paciente`
        WHERE data_nascimento > DATE_SUB(CURRENT_DATE(), INTERVAL 6 YEAR)
          AND cpf IS NULL
    """
    rows_int = executar_query(sql_int, cache_key="perfil_infancia", ttl=settings.CACHE_TTL_SEGUNDOS)
    rows_cpf = executar_query(sql_sem_cpf, cache_key="perfil_infancia_sem_cpf", ttl=settings.CACHE_TTL_SEGUNDOS)

    r = rows_int[0] if rows_int else {}
    sem_cpf = int(rows_cpf[0].get("sem_cpf") or 0) if rows_cpf else 0

    return {
        "faixa_0_1": int(r.get("faixa_0_1") or 0),
        "faixa_1_2": int(r.get("faixa_1_2") or 0),
        "faixa_2_4": int(r.get("faixa_2_4") or 0),
        "faixa_4_6": int(r.get("faixa_4_6") or 0),
        "completam_6_anos_30d": int(r.get("completam_6_anos_30d") or 0),
        "nascimentos_30d": int(r.get("nascimentos_30d") or 0),
        "sem_cpf_menores_6": sem_cpf,
    }


@router.get("/movimentacao-infancia")
def get_movimentacao_infancia():
    """
    Entradas e saídas da população-alvo de Infância na semana corrente.

    Entrada: criança nascida na semana atual (data_nascimento entre segunda e hoje).
    Saída:   criança que completou 6 anos na semana atual
             (DATE_ADD(data_nascimento, INTERVAL 6 YEAR) entre segunda e hoje).

    Fonte: intermediario_prontuario_vitacare.paciente
    Regra de inclusão do modelo: cpf IS NOT NULL AND id_cnes IS NOT NULL.
    """
    sql = f"""
        SELECT
            -- Semana atual: segunda-feira desta semana até hoje
            COUNTIF(
                DATE(data_nascimento)
                    BETWEEN DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY)) AND CURRENT_DATE()
            ) AS entraram,
            COUNTIF(
                DATE_ADD(DATE(data_nascimento), INTERVAL 6 YEAR)
                    BETWEEN DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY)) AND CURRENT_DATE()
            ) AS sairam,
            -- Período equivalente das 4 semanas anteriores (mesmos dias da semana, -7/-14/-21/-28 dias)
            COUNTIF(DATE(data_nascimento) BETWEEN DATE_SUB(DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY)), INTERVAL 7 DAY)  AND DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))  AS entradas_w1,
            COUNTIF(DATE(data_nascimento) BETWEEN DATE_SUB(DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY)), INTERVAL 14 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)) AS entradas_w2,
            COUNTIF(DATE(data_nascimento) BETWEEN DATE_SUB(DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY)), INTERVAL 21 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 21 DAY)) AS entradas_w3,
            COUNTIF(DATE(data_nascimento) BETWEEN DATE_SUB(DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY)), INTERVAL 28 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)) AS entradas_w4,
            COUNTIF(DATE_ADD(DATE(data_nascimento), INTERVAL 6 YEAR) BETWEEN DATE_SUB(DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY)), INTERVAL 7 DAY)  AND DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))  AS saidas_w1,
            COUNTIF(DATE_ADD(DATE(data_nascimento), INTERVAL 6 YEAR) BETWEEN DATE_SUB(DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY)), INTERVAL 14 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)) AS saidas_w2,
            COUNTIF(DATE_ADD(DATE(data_nascimento), INTERVAL 6 YEAR) BETWEEN DATE_SUB(DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY)), INTERVAL 21 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 21 DAY)) AS saidas_w3,
            COUNTIF(DATE_ADD(DATE(data_nascimento), INTERVAL 6 YEAR) BETWEEN DATE_SUB(DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY)), INTERVAL 28 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)) AS saidas_w4
        FROM `{PROJECT}.intermediario_prontuario_vitacare.paciente`
    """
    rows = executar_query(sql, cache_key="movimentacao_infancia", ttl=settings.CACHE_TTL_SEGUNDOS)
    r = rows[0] if rows else {}

    entraram = int(r.get("entraram") or 0)
    sairam = int(r.get("sairam") or 0)

    media_entradas = (
        int(r.get("entradas_w1") or 0)
        + int(r.get("entradas_w2") or 0)
        + int(r.get("entradas_w3") or 0)
        + int(r.get("entradas_w4") or 0)
    ) / 4

    media_saidas = (
        int(r.get("saidas_w1") or 0)
        + int(r.get("saidas_w2") or 0)
        + int(r.get("saidas_w3") or 0)
        + int(r.get("saidas_w4") or 0)
    ) / 4

    def variacao(atual: int, media: float):
        if media == 0:
            return None
        return round((atual - media) / media * 100, 1)

    return {
        "entraram": entraram,
        "sairam": sairam,
        "saldo": entraram - sairam,
        "media_entradas_4_semanas": round(media_entradas, 1),
        "media_saidas_4_semanas": round(media_saidas, 1),
        "variacao_entradas": variacao(entraram, media_entradas),
        "variacao_saidas": variacao(sairam, media_saidas),
    }


@router.get("/cadastro")
def get_cadastro():
    """Qualidade do cadastro Vitacare."""
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
