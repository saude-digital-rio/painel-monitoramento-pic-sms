"""
Rotas de vacinação: série D3 pentavalente, testes rápidos, sequência D1→D2→D3 e cobertura.
"""

import logging

from fastapi import APIRouter, Query

from app.config import settings
from app.services.bigquery import PROJECT, executar_query

router = APIRouter(prefix="/vacinacao", tags=["Vacinação"])
logger = logging.getLogger(__name__)

# Nomes de vacina aceitos pelo filtro do modelo para pentavalente
NOMES_PENTAVALENTE_ACEITOS = {
    "Penta (DTP/Hib/HepB)",
    "DTP+Hib+HepB",
    "Pentavalente",
    "PENTAVALENTE",
    "Penta",
}


@router.get("/serie")
def get_serie_vacinacao(semanas: int = Query(default=12, ge=1, le=52)):
    """
    Série semanal de registros D3 pentavalente por fonte.
    Inclui descartados por motivo (Não aplicada, data nula, outros).
    """
    sql = f"""
        SELECT
            DATE_TRUNC(vacina_registro_data, WEEK) AS semana,
            origem,
            COUNT(*) AS total,
            COUNTIF(vacina_registro_tipo = 'Não aplicada') AS nao_aplicada,
            COUNTIF(vacina_aplicacao_data IS NULL) AS data_aplicacao_nula,
            COUNTIF(
                vacina_registro_tipo NOT IN ('Administração', 'Registro de aplicação anterior')
                AND vacina_registro_tipo != 'Não aplicada'
            ) AS outros_descartados
        FROM `{PROJECT}.registro_vacinal.vacinacao`
        WHERE
            vacina_dose = '3ª Dose'
            AND LOWER(vacina_nome) LIKE '%pentavalente%'
            AND particao_registro_vacinacao >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL {semanas // 4 + 2} MONTH), MONTH)
            AND vacina_registro_data >= DATE_SUB(CURRENT_DATE(), INTERVAL {semanas * 7} DAY)
        GROUP BY semana, origem
        ORDER BY semana
    """
    rows = executar_query(sql, cache_key=f"vac_serie_{semanas}", ttl=settings.CACHE_TTL_SEGUNDOS)

    # Pivotar por semana
    por_semana: dict = {}
    for r in rows:
        semana = str(r["semana"])
        if semana not in por_semana:
            por_semana[semana] = {
                "data": semana,
                "total_d3": 0,
                "d3_sipni": 0,
                "d3_vitacare": 0,
                "descartados_nao_aplicada": 0,
                "descartados_data_nula": 0,
                "descartados_outros": 0,
            }
        origem = r.get("origem", "")
        total = int(r["total"])
        por_semana[semana]["total_d3"] += total
        if origem == "sipni":
            por_semana[semana]["d3_sipni"] += total
        else:
            por_semana[semana]["d3_vitacare"] += total
        por_semana[semana]["descartados_nao_aplicada"] += int(r.get("nao_aplicada") or 0)
        por_semana[semana]["descartados_data_nula"] += int(r.get("data_aplicacao_nula") or 0)
        por_semana[semana]["descartados_outros"] += int(r.get("outros_descartados") or 0)

    result = []
    for item in sorted(por_semana.values(), key=lambda x: x["data"]):
        total_desc = (
            item["descartados_nao_aplicada"]
            + item["descartados_data_nula"]
            + item["descartados_outros"]
        )
        total_total = item["total_d3"] + total_desc
        item["taxa_descarte_pct"] = (
            round(total_desc / total_total * 100, 1) if total_total > 0 else 0
        )
        result.append(item)

    return result


@router.get("/pentavalente")
def get_sequencia_pentavalente():
    """Sequência D1→D2→D3 e intervalos entre doses."""
    # CPFs com cada dose (baseado em todas as doses, não apenas D3)
    sql = f"""
        WITH doses AS (
            SELECT
                paciente_cpf,
                vacina_dose,
                MIN(vacina_aplicacao_data) AS data_dose
            FROM `{PROJECT}.registro_vacinal.vacinacao`
            WHERE
                LOWER(vacina_nome) LIKE '%pentavalente%'
                AND particao_registro_vacinacao >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 7 YEAR), MONTH)
                AND vacina_aplicacao_data IS NOT NULL
                AND vacina_registro_tipo IN ('Administração', 'Registro de aplicação anterior')
            GROUP BY paciente_cpf, vacina_dose
        ),
        com_d3 AS (
            SELECT paciente_cpf, data_dose AS data_d3
            FROM doses WHERE vacina_dose = '3ª Dose'
        ),
        com_d2 AS (
            SELECT paciente_cpf, data_dose AS data_d2
            FROM doses WHERE vacina_dose = '2ª Dose'
        ),
        com_d1 AS (
            SELECT paciente_cpf, data_dose AS data_d1
            FROM doses WHERE vacina_dose = '1ª Dose'
        )
        SELECT
            COUNT(DISTINCT d3.paciente_cpf) AS criancas_com_d3,
            COUNTIF(d2.paciente_cpf IS NOT NULL AND d1.paciente_cpf IS NOT NULL) AS com_d3_e_d2_e_d1,
            COUNTIF(d2.paciente_cpf IS NULL) AS com_d3_sem_d2,
            COUNTIF(d1.paciente_cpf IS NULL) AS com_d3_sem_d1,
            COUNTIF(
                d2.paciente_cpf IS NOT NULL
                AND DATE_DIFF(d3.data_d3, d2.data_d2, DAY) BETWEEN 28 AND 90
            ) AS intervalo_ok,
            COUNTIF(
                d2.paciente_cpf IS NOT NULL
                AND DATE_DIFF(d3.data_d3, d2.data_d2, DAY) < 28
            ) AS intervalo_menor_28d,
            COUNTIF(
                d2.paciente_cpf IS NOT NULL
                AND DATE_DIFF(d3.data_d3, d2.data_d2, DAY) > 90
            ) AS intervalo_maior_90d
        FROM com_d3 d3
        LEFT JOIN com_d2 d2 USING (paciente_cpf)
        LEFT JOIN com_d1 d1 USING (paciente_cpf)
    """
    rows = executar_query(sql, cache_key="pentavalente_seq", ttl=settings.CACHE_TTL_SEGUNDOS)
    r = rows[0] if rows else {}

    # Nomes não mapeados
    sql_nomes = f"""
        SELECT DISTINCT vacina_nome
        FROM `{PROJECT}.registro_vacinal.vacinacao`
        WHERE
            vacina_dose = '3ª Dose'
            AND LOWER(vacina_nome) LIKE '%pentavalente%'
            AND particao_registro_vacinacao >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 7 YEAR), MONTH)
        ORDER BY vacina_nome
    """
    nomes_rows = executar_query(sql_nomes, cache_key="pentavalente_nomes", ttl=settings.CACHE_TTL_SEGUNDOS)
    nomes_nao_mapeados = [
        row["vacina_nome"]
        for row in nomes_rows
        if row.get("vacina_nome") and row["vacina_nome"] not in NOMES_PENTAVALENTE_ACEITOS
    ]

    return {
        "criancas_com_d3": int(r.get("criancas_com_d3") or 0),
        "com_d3_e_d2_e_d1": int(r.get("com_d3_e_d2_e_d1") or 0),
        "com_d3_sem_d2": int(r.get("com_d3_sem_d2") or 0),
        "com_d3_sem_d1": int(r.get("com_d3_sem_d1") or 0),
        "intervalo_d2_d3_ok": int(r.get("intervalo_ok") or 0),
        "intervalo_d2_d3_menor_28d": int(r.get("intervalo_menor_28d") or 0),
        "intervalo_d2_d3_maior_90d": int(r.get("intervalo_maior_90d") or 0),
        "nomes_nao_mapeados": nomes_nao_mapeados[:10],
    }


@router.get("/testes-rapidos")
def get_testes_rapidos(semanas: int = Query(default=12, ge=1, le=52)):
    """
    Série semanal de testes rápidos por tipo e fonte.
    Compara procedimentos clínicos vs. resultados via API (testerapido).
    """
    # Via procedimentos_clinicos — data de referência é loaded_at do próprio registro
    sql_proc = f"""
        SELECT
            DATE_TRUNC(DATE(p.loaded_at), WEEK) AS semana,
            CASE p.co_procedimento
                WHEN '0214010058' THEN 'hiv'
                WHEN '0214010040' THEN 'hiv'
                WHEN '0214010074' THEN 'sifilis'
                WHEN '0214010082' THEN 'sifilis'
                WHEN '0214010090' THEN 'hepc'
                WHEN '0214010104' THEN 'hepb'
                ELSE 'outros'
            END AS tipo,
            COUNT(*) AS total
        FROM `{PROJECT}.brutos_prontuario_vitacare_historico.procedimento_clinico` p
        JOIN `{PROJECT}.brutos_prontuario_vitacare_historico.acto` a
            ON p.id_prontuario_global = a.id_prontuario_global
        WHERE
            p.co_procedimento IN ('0214010058','0214010040','0214010074','0214010082','0214010090','0214010104')
            AND p.data_particao >= DATE_SUB(CURRENT_DATE(), INTERVAL {semanas * 7 + 30} DAY)
            AND DATE(p.loaded_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL {semanas * 7} DAY)
        GROUP BY semana, tipo
    """

    # Via testerapido — data de referência é loaded_at do próprio registro
    sql_tr = f"""
        SELECT
            DATE_TRUNC(DATE(t.loaded_at), WEEK) AS semana,
            COUNTIF(t.resultado_teste_hiv1 IS NOT NULL OR t.resultado_teste_hiv2 IS NOT NULL) AS hiv,
            COUNTIF(t.resultado_teste_sifilis IS NOT NULL) AS sifilis,
            COUNTIF(t.resultado_teste_hepatite_b IS NOT NULL) AS hepb,
            COUNTIF(t.resultado_teste_hepatite_c IS NOT NULL) AS hepc
        FROM `{PROJECT}.brutos_prontuario_vitacare_historico.teste_rapido` t
        JOIN `{PROJECT}.brutos_prontuario_vitacare_historico.acto` a
            ON t.id_prontuario_global = a.id_prontuario_global
        WHERE
            t.data_particao >= DATE_SUB(CURRENT_DATE(), INTERVAL {semanas * 7 + 30} DAY)
            AND DATE(t.loaded_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL {semanas * 7} DAY)
        GROUP BY semana
        ORDER BY semana
    """

    proc_rows = executar_query(sql_proc, cache_key=f"testes_proc_{semanas}", ttl=settings.CACHE_TTL_SEGUNDOS)
    tr_rows = executar_query(sql_tr, cache_key=f"testes_tr_{semanas}", ttl=settings.CACHE_TTL_SEGUNDOS)

    # Pivotar procedimentos
    proc_por_semana: dict = {}
    for r in proc_rows:
        sem = str(r["semana"])
        if sem not in proc_por_semana:
            proc_por_semana[sem] = {}
        proc_por_semana[sem][r["tipo"]] = int(r["total"])

    tr_por_semana = {str(r["semana"]): r for r in tr_rows}

    semanas_set = sorted(set(list(proc_por_semana.keys()) + list(tr_por_semana.keys())))

    result = []
    for sem in semanas_set:
        proc = proc_por_semana.get(sem, {})
        tr = tr_por_semana.get(sem, {})
        result.append(
            {
                "data": sem,
                "hiv_procedimento": proc.get("hiv", 0),
                "hiv_testerapido": int(tr.get("hiv") or 0),
                "sifilis_procedimento": proc.get("sifilis", 0),
                "sifilis_testerapido": int(tr.get("sifilis") or 0),
                "hepb_procedimento": proc.get("hepb", 0),
                "hepb_testerapido": int(tr.get("hepb") or 0),
                "hepc_procedimento": proc.get("hepc", 0),
                "hepc_testerapido": int(tr.get("hepc") or 0),
            }
        )

    return result


@router.get("/cobertura-d3")
def get_cobertura_d3():
    """
    Cobertura de D3 pentavalente entre crianças da população-alvo (Infância).
    JOIN entre publico_alvo e registro_vacinal para calcular quantas crianças da
    população-alvo têm pelo menos uma dose D3 registrada.
    """
    sql = f"""
        SELECT
            COUNT(DISTINCT pa.cpf) AS criancas_alvo,
            COUNT(DISTINCT v.paciente_cpf) AS com_d3_registrado
        FROM `{PROJECT}.projeto_pic.publico_alvo` pa
        LEFT JOIN `{PROJECT}.registro_vacinal.vacinacao` v
            ON pa.cpf = v.paciente_cpf
            AND v.vacina_dose = '3ª Dose'
            AND LOWER(v.vacina_nome) LIKE '%pentavalente%'
            AND v.vacina_registro_tipo IN ('Administração', 'Registro de aplicação anterior')
            AND v.vacina_aplicacao_data IS NOT NULL
            AND v.particao_registro_vacinacao >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 7 YEAR), MONTH)
        WHERE pa.tipo_publico = 'Infancia'
    """
    rows = executar_query(sql, cache_key="vac_cobertura_d3", ttl=settings.CACHE_TTL_SEGUNDOS)
    r = rows[0] if rows else {}

    criancas_alvo = int(r.get("criancas_alvo") or 0)
    com_d3 = int(r.get("com_d3_registrado") or 0)
    cobertura_pct = round(com_d3 / criancas_alvo * 100, 1) if criancas_alvo > 0 else 0.0

    return {
        "criancas_alvo": criancas_alvo,
        "com_d3_registrado": com_d3,
        "cobertura_pct": cobertura_pct,
    }


@router.get("/divergencia-testes")
def get_divergencia_testes():
    """
    Snapshot da última semana completa comparando procedimentos clínicos
    vs. registros via testerapido API, por tipo de teste rápido.
    """
    sql_proc = f"""
        SELECT
            CASE p.co_procedimento
                WHEN '0214010058' THEN 'hiv'
                WHEN '0214010040' THEN 'hiv'
                WHEN '0214010074' THEN 'sifilis'
                WHEN '0214010082' THEN 'sifilis'
                WHEN '0214010090' THEN 'hepc'
                WHEN '0214010104' THEN 'hepb'
            END AS tipo,
            COUNT(*) AS total
        FROM `{PROJECT}.brutos_prontuario_vitacare_historico.procedimento_clinico` p
        JOIN `{PROJECT}.brutos_prontuario_vitacare_historico.acto` a
            ON p.id_prontuario_global = a.id_prontuario_global
        WHERE
            p.co_procedimento IN ('0214010058','0214010040','0214010074','0214010082','0214010090','0214010104')
            AND p.data_particao >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), MONTH)
            AND DATE(p.loaded_at) BETWEEN
                DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 WEEK), WEEK)
                AND DATE_SUB(DATE_TRUNC(CURRENT_DATE(), WEEK), INTERVAL 1 DAY)
        GROUP BY tipo
    """
    sql_tr = f"""
        SELECT
            COUNTIF(t.resultado_teste_hiv1 IS NOT NULL OR t.resultado_teste_hiv2 IS NOT NULL) AS hiv,
            COUNTIF(t.resultado_teste_sifilis IS NOT NULL) AS sifilis,
            COUNTIF(t.resultado_teste_hepatite_b IS NOT NULL) AS hepb,
            COUNTIF(t.resultado_teste_hepatite_c IS NOT NULL) AS hepc
        FROM `{PROJECT}.brutos_prontuario_vitacare_historico.teste_rapido` t
        JOIN `{PROJECT}.brutos_prontuario_vitacare_historico.acto` a
            ON t.id_prontuario_global = a.id_prontuario_global
        WHERE
            t.data_particao >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), MONTH)
            AND DATE(t.loaded_at) BETWEEN
                DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 WEEK), WEEK)
                AND DATE_SUB(DATE_TRUNC(CURRENT_DATE(), WEEK), INTERVAL 1 DAY)
    """
    proc_rows = executar_query(sql_proc, cache_key="diverg_proc", ttl=settings.CACHE_TTL_SEGUNDOS)
    tr_rows = executar_query(sql_tr, cache_key="diverg_tr", ttl=settings.CACHE_TTL_SEGUNDOS)

    proc = {r["tipo"]: int(r["total"]) for r in proc_rows if r.get("tipo")}
    tr = tr_rows[0] if tr_rows else {}

    def _divergencia(tipo: str) -> dict:
        p = proc.get(tipo, 0)
        t = int(tr.get(tipo) or 0)
        diff = abs(p - t)
        pct = round(diff / p * 100, 1) if p > 0 else 0.0
        return {"procedimento": p, "testerapido": t, "diferenca": diff, "pct": pct}

    return {
        "hiv": _divergencia("hiv"),
        "sifilis": _divergencia("sifilis"),
        "hepb": _divergencia("hepb"),
        "hepc": _divergencia("hepc"),
    }
