# Prompt — Arquitetura do painel sem PostgreSQL

Considere que o projeto é um **painel interno de diagnóstico e qualidade de dados**, destinado exclusivamente à **visualização e ao acompanhamento de informações analíticas**.

O painel deverá permitir o monitoramento de aspectos como:

* atualização das fontes de dados;
* volume de registros;
* séries históricas;
* variações de volume;
* qualidade e completude dos dados;
* inconsistências temporais;
* cobertura de eventos;
* execução dos modelos;
* anomalias identificadas nos dados;
* análises por público-alvo, período e unidade de saúde.

Os dados exibidos pelo painel serão consultados diretamente de tabelas e modelos existentes no **BigQuery**.

Neste momento, **não haverá inserção, edição ou exclusão de dados pelo usuário**. Também não haverá funcionalidades que precisem armazenar informações próprias da aplicação, como comentários, observações, configurações persistentes, status de investigação, cadastros ou outros dados transacionais.

Por esse motivo, **não é necessário utilizar PostgreSQL, SQLAlchemy ou Alembic nesta etapa do projeto**. Não deve ser criado um banco de dados relacional apenas para reproduzir ou armazenar dados que já estão disponíveis no BigQuery.

A arquitetura inicial deverá ser:

```text
Next.js
   ↓
FastAPI
   ↓
BigQuery
```

### Stack tecnológica

**Frontend**

* Next.js 14
* shadcn/ui
* TailwindCSS

**Backend**

* FastAPI

**Fonte de dados analítica**

* BigQuery

**Infraestrutura**

* Docker Compose

O **FastAPI** será responsável por consultar o BigQuery, aplicar os tratamentos necessários para disponibilização dos dados e fornecer as informações ao frontend por meio de endpoints da API.

O **Next.js** será responsável pela interface do painel, incluindo cards, gráficos, tabelas, filtros e demais componentes de visualização.

O **BigQuery será a fonte de dados do painel**, sem necessidade de replicação desses dados em PostgreSQL.

Caso futuramente sejam adicionadas funcionalidades que exijam persistência de dados próprios da aplicação, como comentários, configurações, registros de investigação ou outras informações inseridas pelos usuários, a inclusão de um banco PostgreSQL poderá ser reavaliada. Até que exista essa necessidade, a arquitetura deverá permanecer sem banco de dados transacional próprio.


A conexão ficaria no **backend FastAPI**, não no frontend.

O fluxo seria:

```text
Next.js
  ↓ chamada HTTP
FastAPI
  ↓ consulta
BigQuery
  ↓ resultado
FastAPI
  ↓ JSON
Next.js
```

No backend você instala a biblioteca oficial:

```bash
pip install google-cloud-bigquery
```

E cria um cliente do BigQuery. A biblioteca pode usar **Application Default Credentials (ADC)**, então você não precisa colocar credencial dentro do código. A própria documentação do Google recomenda esse modelo. ([Google Cloud Documentation][1])

Um exemplo simples:

```python
from google.cloud import bigquery

client = bigquery.Client(project="rj-sms")

def buscar_volume_publico():
    query = """
        SELECT
            tipo_publico,
            COUNT(*) AS total
        FROM `rj-sms.projeto_pic.publico_alvo`
        GROUP BY tipo_publico
    """

    resultado = client.query(query).result()

    return [
        {
            "tipo_publico": row.tipo_publico,
            "total": row.total,
        }
        for row in resultado
    ]
```

Depois você expõe isso no FastAPI:

```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/publico-alvo/volume")
def get_volume_publico():
    return buscar_volume_publico()
```

E o Next.js chama:

```text
GET /publico-alvo/volume
```

### Autenticação local

No seu computador, você pode usar exatamente aquela configuração do projeto Saúde Digital:

```bash
gcloud auth application-default login
```

Isso cria as credenciais que a biblioteca Python encontra automaticamente quando você faz:

```python
client = bigquery.Client()
```

Ou seja, você **não precisa passar usuário, senha ou chave no código**. ([Google Cloud Documentation][1])

### Em produção

Em produção, a ideia também é não colocar arquivo de chave dentro do projeto. O serviço onde o FastAPI estiver rodando recebe uma **identidade/conta de serviço com permissão de leitura no BigQuery**, e o ADC encontra essa identidade automaticamente. Isso permite usar praticamente o mesmo código entre desenvolvimento e produção. ([Google Cloud Documentation][1])

Para o seu painel, eu organizaria o backend mais ou menos assim:

```text
backend/
├── app/
│   ├── main.py
│   ├── routers/
│   │   ├── publico_alvo.py
│   │   ├── eventos.py
│   │   ├── vacinacao.py
│   │   └── qualidade.py
│   └── services/
│       └── bigquery.py
└── requirements.txt
```

E o `services/bigquery.py` centraliza a conexão:

```python
from google.cloud import bigquery

client = bigquery.Client()
```

Os demais serviços usam esse `client` para executar as consultas.

Então, no seu caso, a arquitetura realmente pode ficar bem simples:

**Next.js → FastAPI → BigQuery**

Sem PostgreSQL, SQLAlchemy ou Alembic enquanto o painel for somente leitura.

[1]: https://docs.cloud.google.com/bigquery/docs/authentication/getting-started?hl=pt-BR&utm_source=chatgpt.com "Começar a usar a autenticação  |  BigQuery  |  Google Cloud Documentation"