# Painel de Diagnóstico e Qualidade de Dados — Dimensão Saúde

Aplicação interna da Secretaria Municipal de Saúde do Rio de Janeiro (SMS-Rio) para monitoramento da qualidade dos dados da dimensão Saúde do Programa Pequenos Cariocas (PIC).

O painel tem caráter de acompanhamento e diagnóstico técnico. O cálculo oficial dos protocolos permanece sob responsabilidade da Iplanrio.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind CSS) |
| Backend | FastAPI + Uvicorn (Python) |
| Dados | Google BigQuery (`rj-sms`) |
| Deploy | Docker + Google Cloud Run |

Não há banco de dados relacional. O BigQuery é a única fonte de dados.

---

## Arquitetura

```
Navegador
   ↓ HTTP (NEXT_PUBLIC_API_URL)
Next.js 16  ←→  FastAPI  ←→  BigQuery
   ↑ SSR interno (INTERNAL_API_URL)
```

Server Components do Next.js chamam o backend diretamente via rede interna Docker (`http://backend:8000`). Client Components chamam via URL pública (`http://localhost:8000` em dev).

O backend mantém um cache em memória com TTL configurável (padrão: 5 min para queries, 10 min para metadados) para evitar leituras repetidas no BigQuery.

---

## Estrutura do projeto

```
painel-monitoramento-pic-sms/
├── backend/
│   ├── app/
│   │   ├── routers/        # alertas, eventos, fontes, populacao, unidades, vacinacao
│   │   ├── services/       # cliente BigQuery com cache em memória
│   │   ├── config.py       # variáveis de ambiente via pydantic-settings
│   │   └── main.py         # CORS, inclusão dos routers
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/            # rotas: visao-geral, fontes, populacao, eventos,
│   │   │                   #        consistencia, unidades, alertas
│   │   ├── components/     # layout, charts, ui
│   │   └── lib/            # cliente HTTP da API
│   └── Dockerfile
├── docker-compose.yml
├── .env                    # não versionado — copie de .env.example
└── .gitignore
```

---

## Pré-requisitos

- Docker e Docker Compose instalados
- Autenticação no Google Cloud configurada localmente:

```bash
gcloud auth application-default login
```

---

## Rodando com Docker (recomendado)

**1. Crie o arquivo `.env` na raiz do projeto:**

```bash
cp .env.example .env   # ajuste os valores se necessário
```

Variáveis principais:

```env
GCP_PROJECT=rj-sms
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://frontend:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
INTERNAL_API_URL=http://backend:8000
CACHE_TTL_SEGUNDOS=300
CACHE_TTL_METADATA=600
```

**2. Suba os serviços:**

```bash
docker compose up --build
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend (API) | http://localhost:8000 |
| Documentação da API | http://localhost:8000/docs |

---

## Rodando localmente (sem Docker)

**Backend:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

---

## Autenticação no BigQuery

Em desenvolvimento, o backend usa [Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/application-default-credentials).

```bash
gcloud auth application-default login
```

No Docker, as credenciais são montadas automaticamente via volume (configurado no `docker-compose.yml`):

```yaml
volumes:
  - ${HOME}/.config/gcloud/application_default_credentials.json:/root/.config/gcloud/application_default_credentials.json:ro
```

Em produção (Cloud Run), as credenciais são providas pela Service Account associada ao serviço — sem necessidade de arquivo local.

---

## Páginas e endpoints

| Página | Rota frontend | Endpoint backend |
|---|---|---|
| Visão Geral | `/visao-geral` | `/alertas`, `/fontes/status` |
| Fontes e Atualização | `/fontes` | `/fontes/status`, `/fontes/modelos` |
| População-alvo | `/populacao` | `/populacao/*` |
| Eventos | `/eventos` | `/eventos/*` |
| Consistência entre Fontes | `/consistencia` | `/vacinacao/*` |
| Unidades de Saúde | `/unidades` | `/unidades` |
| Alertas | `/alertas` | `/alertas` |