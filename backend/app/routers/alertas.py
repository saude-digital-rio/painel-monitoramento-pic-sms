"""
RF-12: Alertas computados em tempo real a partir das métricas das outras rotas.

Os alertas são gerados dinamicamente pelas regras definidas nos requisitos.
Não há banco de dados de alertas — eles são derivados dos dados do BigQuery.
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Callable

from fastapi import APIRouter

from app.config import settings
from app.services.bigquery import PROJECT, executar_query
from app.routers.fontes import get_status_fontes, get_execucoes_modelos

router = APIRouter(prefix="/alertas", tags=["Alertas"])
logger = logging.getLogger(__name__)

AGORA = None  # Resolvido em runtime


def _agora_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _check_fontes() -> list[dict]:
    alertas = []
    fontes = get_status_fontes()
    for fonte in fontes:
        if fonte.get("severidade") not in ("critico", "alerta"):
            continue
        horas = fonte.get("horas_sem_atualizacao", 0)
        variacao = fonte.get("variacao_pct")
        if horas and horas > 24:
            alertas.append({
                "id": f"FRESH_{fonte['tabela']}",
                "categoria": "Freshness de Fonte",
                "descricao": f"{fonte['tabela']} sem atualização há {horas:.0f}h",
                "severidade": fonte["severidade"],
                "data": _agora_iso(),
                "tabela": fonte["tabela"],
                "investigado": False,
                "esperado": False,
            })
        if variacao is not None and abs(variacao) > 10:
            alertas.append({
                "id": f"VOL_{fonte['tabela']}",
                "categoria": "Volume de Fonte",
                "descricao": f"{fonte['tabela']}: variação de {variacao:+.1f}% vs média 7d (limite: ±10%)",
                "severidade": "critico" if abs(variacao) > 20 else "alerta",
                "data": _agora_iso(),
                "tabela": fonte["tabela"],
                "investigado": False,
                "esperado": False,
            })
    return alertas


def _check_modelos() -> list[dict]:
    alertas = []
    for modelo in get_execucoes_modelos():
        if modelo.get("severidade") == "critico":
            alertas.append({
                "id": f"MODELO_{modelo['modelo']}",
                "categoria": "Execução de Modelo",
                "descricao": f"{modelo['modelo']}: intervalo de {modelo.get('intervalo_horas', 0):.1f}h (limite: 25h)",
                "severidade": "critico",
                "data": _agora_iso(),
                "tabela": modelo["modelo"],
                "investigado": False,
                "esperado": False,
            })
    return alertas


def _check_janelas() -> list[dict]:
    sql = f"""
        SELECT
            COUNTIF(tipo_publico = 'Gestacao' AND DATE_DIFF(fim, inicio, DAY) <= 0) AS gestacao_duracao_invalida,
            COUNTIF(tipo_publico = 'Gestacao' AND DATE_DIFF(fim, inicio, DAY) > 300) AS gestacao_acima_300,
            COUNTIF(tipo_publico = 'Puerperio' AND DATE_DIFF(fim, inicio, DAY) != 45) AS puerperio_diferente_45
        FROM `{PROJECT}.projeto_pic.publico_alvo`
    """
    r = (executar_query(sql, cache_key="alerta_janelas", ttl=settings.CACHE_TTL_SEGUNDOS) or [{}])[0]
    invalida = int(r.get("gestacao_duracao_invalida") or 0)
    acima = int(r.get("gestacao_acima_300") or 0)
    if invalida > 0 or acima > 0:
        return [{
            "id": "JANELA_GESTACAO",
            "categoria": "Janelas Temporais",
            "descricao": f"{acima} gestações com janela > 300 dias; {invalida} com duração zero/negativa",
            "severidade": "alerta",
            "data": _agora_iso(),
            "tabela": "mart_iplanrio_pic__publico_alvo",
            "segmento": "Gestacao",
            "investigado": False,
            "esperado": False,
        }]
    return []


def _check_datas() -> list[dict]:
    sql = f"""
        SELECT
            COUNTIF(data_evento > CURRENT_DATE()) AS eventos_futuro,
            COUNTIF(distancia_dias < 0) AS distancia_negativa
        FROM `{PROJECT}.projeto_pic.eventos`
    """
    r = (executar_query(sql, cache_key="alerta_datas", ttl=settings.CACHE_TTL_SEGUNDOS) or [{}])[0]
    futuro = int(r.get("eventos_futuro") or 0)
    distancia = int(r.get("distancia_negativa") or 0)
    if futuro > 0 or distancia > 0:
        return [{
            "id": "DATA_INCONSISTENCIA",
            "categoria": "Consistência de Datas",
            "descricao": f"{futuro} eventos com data no futuro; {distancia} com distancia_dias negativa",
            "severidade": "alerta",
            "data": _agora_iso(),
            "tabela": "mart_iplanrio_pic__eventos",
            "investigado": False,
            "esperado": False,
        }]
    return []


def _check_overlap() -> list[dict]:
    sql = f"""
        SELECT COUNT(*) AS total
        FROM (
            SELECT cpf, COUNT(DISTINCT tipo_publico) AS n
            FROM `{PROJECT}.projeto_pic.publico_alvo`
            GROUP BY cpf HAVING n > 1
        )
    """
    rows = executar_query(sql, cache_key="alerta_overlap", ttl=settings.CACHE_TTL_SEGUNDOS)
    n = int(rows[0]["total"]) if rows else 0
    if n > 0:
        return [{
            "id": "CPF_SOBREPOSICAO",
            "categoria": "Sobreposição de CPF",
            "descricao": f"{n} CPFs presentes em mais de um segmento da população-alvo",
            "severidade": "aviso",
            "data": _agora_iso(),
            "tabela": "mart_iplanrio_pic__publico_alvo",
            "investigado": False,
            "esperado": False,
        }]
    return []


def _check_penta() -> list[dict]:
    sql = f"""
        WITH doses AS (
            SELECT paciente_cpf, vacina_dose, MIN(vacina_aplicacao_data) AS data_dose
            FROM `{PROJECT}.registro_vacinal.vacinacao`
            WHERE
                LOWER(vacina_nome) LIKE '%pentavalente%'
                AND particao_registro_vacinacao >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 7 YEAR), MONTH)
                AND vacina_aplicacao_data IS NOT NULL
                AND vacina_registro_tipo IN ('Administração', 'Registro de aplicação anterior')
            GROUP BY paciente_cpf, vacina_dose
        )
        SELECT
            COUNTIF(DATE_DIFF(d3.data_dose, d2.data_dose, DAY) < 28) AS intervalo_curto,
            COUNTIF(DATE_DIFF(d3.data_dose, d2.data_dose, DAY) > 90) AS intervalo_longo
        FROM doses d3
        JOIN doses d2 USING (paciente_cpf)
        WHERE d3.vacina_dose = '3ª Dose' AND d2.vacina_dose = '2ª Dose'
    """
    r = (executar_query(sql, cache_key="alerta_penta", ttl=settings.CACHE_TTL_SEGUNDOS) or [{}])[0]
    curto = int(r.get("intervalo_curto") or 0)
    longo = int(r.get("intervalo_longo") or 0)
    if curto > 0 or longo > 0:
        return [{
            "id": "PENTA_INTERVALO",
            "categoria": "Pentavalente",
            "descricao": f"{curto} crianças com intervalo D2→D3 < 28 dias; {longo} com > 90 dias",
            "severidade": "alerta",
            "data": _agora_iso(),
            "tabela": "mart_cit__vacinacao",
            "segmento": "Infancia",
            "investigado": False,
            "esperado": False,
        }]
    return []


_CHECKS: list[Callable[[], list[dict]]] = [
    _check_fontes,
    _check_modelos,
    _check_janelas,
    _check_datas,
    _check_overlap,
    _check_penta,
]


@router.get("")
def get_alertas():
    """
    RF-12: Gera lista de alertas ativos com base nas regras de alerta prioritárias.
    As verificações são executadas em paralelo para reduzir latência.
    """
    alertas: list[dict] = []
    with ThreadPoolExecutor(max_workers=len(_CHECKS)) as pool:
        futures = {pool.submit(check): check.__name__ for check in _CHECKS}
        for future in as_completed(futures):
            try:
                alertas.extend(future.result())
            except Exception:
                logger.exception("Erro na verificação de alertas: %s", futures[future])
    return alertas
