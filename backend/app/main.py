"""
PIC-SMS Monitor — Backend FastAPI
Conecta ao BigQuery via Application Default Credentials (ADC).

Para rodar localmente:
    gcloud auth application-default login
    uvicorn app.main:app --reload --port 8000
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import alertas, eventos, fontes, populacao, unidades, vacinacao

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(
    title="PIC-SMS Monitor API",
    description="API de diagnóstico e qualidade de dados — Dimensão Saúde",
    version="0.1.0",
)

# CORS: origens permitidas lidas de CORS_ORIGINS (separadas por vírgula)
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Routers
app.include_router(fontes.router, prefix="/api")
app.include_router(populacao.router, prefix="/api")
app.include_router(eventos.router, prefix="/api")
app.include_router(vacinacao.router, prefix="/api")
app.include_router(unidades.router, prefix="/api")
app.include_router(alertas.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
