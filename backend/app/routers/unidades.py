"""
RF-15: Unidades de saúde — análise por CNES.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter

from app.config import settings
from app.services.bigquery import PROJECT, executar_query

router = APIRouter(prefix="/unidades", tags=["Unidades"])
logger = logging.getLogger(__name__)

LIMITE_QUEDA_CRITICO = 30.0  # > 30% de queda
LIMITE_AUSENCIA_AVISO = 24
LIMITE_AUSENCIA_ALERTA = 48
LIMITE_AUSENCIA_CRITICO = 72


def _severidade_unidade(variacao_pct: float, horas_sem_evento: float) -> str:
    if horas_sem_evento >= LIMITE_AUSENCIA_CRITICO or variacao_pct <= -LIMITE_QUEDA_CRITICO:
        return "critico"
    if horas_sem_evento >= LIMITE_AUSENCIA_ALERTA:
        return "alerta"
    if horas_sem_evento >= LIMITE_AUSENCIA_AVISO:
        return "aviso"
    return "ok"


@router.get("")
def get_unidades():
    """
    RF-15: Lista de unidades com volume de eventos nos últimos 7 dias
    e média histórica (últimas 4 semanas).
    Fonte: raw_prontuario_vitacare__atendimento (tem o campo cnes_unidade).
    """
    sql = f"""
        WITH eventos_7d AS (
            SELECT
                cnes_unidade,
                COUNT(*) AS eventos_7d,
                MAX(DATE(datahora_inicio)) AS ultima_data
            FROM `{PROJECT}.brutos_prontuario_vitacare.atendimento`
            WHERE
                cpf IS NOT NULL
                AND data_particao >= DATE_SUB(CURRENT_DATE(), INTERVAL 8 DAY)
                AND DATE(datahora_inicio) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
            GROUP BY cnes_unidade
        ),
        eventos_hist AS (
            SELECT
                cnes_unidade,
                COUNT(*) / 4.0 AS media_semanal
            FROM `{PROJECT}.brutos_prontuario_vitacare.atendimento`
            WHERE
                cpf IS NOT NULL
                AND data_particao >= DATE_SUB(CURRENT_DATE(), INTERVAL 29 DAY)
                AND DATE(datahora_inicio) >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
                AND DATE(datahora_inicio) < DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
            GROUP BY cnes_unidade
        )
        SELECT
            COALESCE(e7.cnes_unidade, eh.cnes_unidade) AS cnes,
            COALESCE(e7.eventos_7d, 0) AS eventos_7d,
            COALESCE(eh.media_semanal, 0) AS eventos_media_hist,
            e7.ultima_data
        FROM eventos_7d e7
        FULL OUTER JOIN eventos_hist eh USING (cnes_unidade)
        WHERE COALESCE(e7.cnes_unidade, eh.cnes_unidade) IS NOT NULL
        ORDER BY eventos_7d ASC
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
                "nome": f"Unidade CNES {cnes}",  # Nome real precisaria de JOIN com tabela de cadastro de estabelecimentos
                "ap": None,
                "eventos_7d": eventos_7d,
                "eventos_media_hist": round(media_hist),
                "variacao_pct": variacao_pct,
                "ultima_atividade": ultima_data.isoformat() if ultima_data else None,
                "horas_sem_evento": horas_sem_evento,
                "severidade": severidade,
                "populacao": None,
            }
        )

    return resultado
