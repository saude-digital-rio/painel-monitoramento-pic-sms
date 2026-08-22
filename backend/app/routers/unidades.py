"""
Unidades de saúde — análise por CNES.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter

from app.config import settings
from app.services.bigquery import PROJECT, executar_query

router = APIRouter(prefix="/unidades", tags=["Unidades"])
logger = logging.getLogger(__name__)

LIMITE_AUSENCIA_AVISO = 24
LIMITE_AUSENCIA_ALERTA = 48
LIMITE_AUSENCIA_CRITICO = 72


def _severidade_unidade(variacao_pct: float, horas_sem_evento: float) -> str:
    if horas_sem_evento >= LIMITE_AUSENCIA_CRITICO or variacao_pct <= -25:
        return "critico"
    if horas_sem_evento >= LIMITE_AUSENCIA_ALERTA or variacao_pct <= -15:
        return "alerta"
    if horas_sem_evento >= LIMITE_AUSENCIA_AVISO:
        return "aviso"
    return "ok"


@router.get("")
def get_unidades():
    """
    Lista de unidades com volume de eventos nos últimos 7 dias
    e média histórica (últimas 4 semanas).
    Fonte: raw_prontuario_vitacare__atendimento (tem o campo cnes_unidade).
    """
    sql = f"""
        WITH publico AS (
            SELECT DISTINCT cpf
            FROM `{PROJECT}.projeto_pic.publico_alvo`
        ),
        atendimentos_pic AS (
            SELECT
                a.cnes_unidade,
                DATE(a.datahora_inicio) AS data_atendimento
            FROM `{PROJECT}.brutos_prontuario_vitacare.atendimento` a
            WHERE a.cpf IS NOT NULL
              AND a.cpf IN (SELECT cpf FROM publico)
              AND (
                REGEXP_CONTAINS(a.tipo_consulta, r'(?i)visita')
                OR REGEXP_CONTAINS(
                    REGEXP_REPLACE(NORMALIZE_AND_CASEFOLD(a.cbo_descricao_profissional, NFKD), r'\pM', ''),
                    r'medico|enfermeiro'
                )
              )
        ),
        eventos_7d AS (
            -- Atual: d-6 até hoje (7 datas exatas)
            SELECT
                cnes_unidade,
                COUNT(*) AS eventos_7d,
                MAX(data_atendimento) AS ultima_data
            FROM atendimentos_pic
            WHERE data_atendimento BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY) AND CURRENT_DATE()
            GROUP BY cnes_unidade
        ),
        eventos_hist AS (
            -- Média de 4 janelas semanais anteriores sem sobreposição
            SELECT
                cnes_unidade,
                (
                    COUNTIF(data_atendimento BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 13 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
                  + COUNTIF(data_atendimento BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 20 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY))
                  + COUNTIF(data_atendimento BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 27 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 21 DAY))
                  + COUNTIF(data_atendimento BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 34 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY))
                ) / 4.0 AS media_semanal
            FROM atendimentos_pic
            WHERE data_atendimento BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 34 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
            GROUP BY cnes_unidade
        ),
        base AS (
            SELECT
                COALESCE(e7.cnes_unidade, eh.cnes_unidade) AS cnes,
                COALESCE(e7.eventos_7d, 0) AS eventos_7d,
                COALESCE(eh.media_semanal, 0) AS eventos_media_hist,
                e7.ultima_data
            FROM eventos_7d e7
            FULL OUTER JOIN eventos_hist eh USING (cnes_unidade)
            WHERE COALESCE(e7.cnes_unidade, eh.cnes_unidade) IS NOT NULL
          AND COALESCE(e7.cnes_unidade, eh.cnes_unidade) != '9999999'
        )
        SELECT
            b.cnes,
            b.eventos_7d,
            b.eventos_media_hist,
            b.ultima_data,
            e.area_programatica AS ap,
            COALESCE(e.nome_limpo, CONCAT('Unidade CNES ', b.cnes)) AS nome
        FROM base b
        LEFT JOIN `{PROJECT}.saude_dados_mestres.estabelecimento` e
            ON b.cnes = e.id_cnes
        ORDER BY b.eventos_7d ASC
        LIMIT 200
    """
    rows = executar_query(sql, cache_key="unidades_lista", ttl=settings.CACHE_TTL_SEGUNDOS)

    agora = datetime.now(tz=timezone.utc)
    resultado = []

    for r in rows:
        cnes = r.get("cnes") or ""
        eventos_7d = int(r.get("eventos_7d") or 0)
        media_hist = float(r.get("eventos_media_hist") or 0)
        ultima_data = r.get("ultima_data")

        variacao_pct = 0.0
        if media_hist > 0:
            variacao_pct = round((eventos_7d - media_hist) / media_hist * 100, 1)

        # Horas sem evento
        if ultima_data:
            ultima_dt = datetime.combine(ultima_data, datetime.min.time()).replace(tzinfo=timezone.utc)
            horas_sem_evento = round((agora - ultima_dt).total_seconds() / 3600, 1)
        else:
            horas_sem_evento = 999.0

        severidade = _severidade_unidade(variacao_pct, horas_sem_evento)

        resultado.append(
            {
                "cnes": cnes,
                "nome": r.get("nome") or f"Unidade CNES {cnes}",
                "ap": r.get("ap"),
                "eventos_7d": eventos_7d,
                "eventos_media_hist": round(media_hist),
                "variacao_pct": variacao_pct,
                "ultima_atividade": ultima_data.isoformat() if ultima_data else None,
                "horas_sem_evento": horas_sem_evento,
                "severidade": severidade,
            }
        )

    return resultado
