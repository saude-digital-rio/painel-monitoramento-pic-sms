**Documentação de Requisitos **

**Painel de Diagnóstico e Qualidade de Dados - Dimensão Saúde**

Atualizado: 07 de agosto de 2026

| **Pergunta central do painel: “O que a SMS está enviando para o PIC está correto?”** |
| ------------------------------------------------------------------------------------ |



# 1. Objetivo e público-alvo

O objetivo é permitir que a equipe interna identifique rapidamente falhas de atualização, anomalias de volume, problemas de cadastro, inconsistências temporais, divergências entre fontes e problemas nos dados transmitidos à Iplanrio que possam afetar o painel do Pequenos Cariocas.

# 2. Escopo monitorado

O painel deve acompanhar tanto as bases-fonte utilizadas nos modelos quanto os dois modelos de saída enviados ao PIC.

| **FonteTabelaConteúdo principal** |                                                                                                                                               |                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Vitacare                          | raw\_prontuario\_vitacare\_\_atendimento                                                                                                      | Consultas e visitas domiciliares                                     |
| Vitacare                          | raw\_prontuario\_vitacare\_historico\_\_procedimentos\_clinicos                                                                               | Procedimentos clínicos / testes rápidos                              |
| Vitacare                          | raw\_prontuario\_vitacare\_historico\_\_acto                                                                                                  | Tabela ponte de procedimentos e testes rápidos                       |
| Vitacare                          | raw\_prontuario\_vitacare\_historico\_\_testerapido                                                                                           | Resultados de testes rápidos                                         |
| Vitacare                          | int\_prontuario\_vitacare\_\_paciente                                                                                                         | Cadastro de pacientes                                                |
| Mart vacinação                    | mart\_cit\_\_vacinacao                                                                                                                        | Registro consolidado de vacinação (fonte única para pentavalente D3) |
| BI gestações SUBPAV               | mart\_bi\_gestacoes\_\_gestacoes                                                                                                              | Classificação de fases de gestação e puerpério                       |
| Histórico clínico                 | mart\_historico\_clinico\_\_episodio                                                                                                          | Episódios clínicos e CIDs                                            |
| **Camada**                        | **O que deve ser monitorado**                                                                                                                 |                                                                      |
| População-alvo                    | mart\_iplanrio\_pic\_\_publico\_alvo: gestantes, puérperas e crianças, com suas respectivas janelas de acompanhamento.                        |                                                                      |
| Eventos clínicos                  | mart\_iplanrio\_pic\_\_eventos: consultas, visitas, testes rápidos, diagnósticos e vacinação (D3 de pentavalente) vinculados ao público-alvo. |                                                                      |

## Regras de janela da população-alvo

| **SegmentoRegra** |                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Gestação          | Gestação ativa; início em data\_inicio e fim em LEAST(data\_inicio + 300 dias, data atual). |
| Puerpério         | Puerpério ativo; início em data\_fim\_efetiva e fim 45 dias depois.                         |
| Infância          | Crianças nascidas nos últimos 6 anos; início no nascimento e fim 6 anos depois.             |



# 3. Perguntas que o painel deve responder

- As fontes que alimentam o PIC estão atualizadas? Alguma parou de atualizar?
- O volume da população-alvo ou dos eventos variou de forma inesperada ao longo do tempo?
- As janelas de gestação, puerpério e infância estão sendo calculadas de forma coerente?
- Os eventos possuem datas válidas e estão associados ao segmento correto?
- Vitacare e SIPNI apresentam dados atualizados de vacinação?
- Os testes rápidos estão sendo capturados de forma consistente fontes?
- Alguma unidade de saúde deixou de reportar eventos ou apresentou queda anormal?
- Os modelos rodaram no prazo esperado e sem variações inesperadas de volume? 
- Quais protocolos podem ter sido potencialmente impactados por alterações ou inconsistências nas bases de dados que alimentam suas regras?

# 4. Requisitos funcionais



| **IDRequisitoEspecificação** |                                     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RF-01**                    | Atualização das bases-fonte         | Mostrar a data/hora da última atualização e o volume das fontes; sinalizar visualmente atrasos por faixas de tempo — **24h, 48h e 72h sem atualização** — com severidade crescente conforme o período sem dados. Acompanhar também variações atípicas de volume em relação ao histórico da fonte.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **RF-02**                    | Volume da população-alvo            | Série histórica por Gestação, Puerpério e Infância; comparar dia, semana e mês; alertar variações diárias superiores a ±5% e sobreposição de CPF entre segmentos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **RF-03**                    | Entradas e saídas da população-alvo | Exibir, por período e segmento, o volume de CPFs que entraram e saíram da população-alvo entre execuções consecutivas. Para saídas, classificar o motivo quando identificável: encerramento de gestação, expiração de janela (300 dias / 45 dias / 6 anos) ou desaparecimento do cadastro. Sinalizar semanas com volume de saída atípico em relação à média histórica.                                                                                                                                                                                                                                                                                                                                                                                                                |
| **RF-04**                    | Janelas temporais                   | Avaliar duração das janelas; alertar duração zero/negativa, Gestação > 300 dias, Puerpério diferente de 45 dias e Infância diferente de aproximadamente 6 anos (2190 dias).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **RF-05**                    | Volume e cobertura de eventos       | Série histórica de eventos por tipo e segmento; medir população com pelo menos um evento; alertar queda semanal superior a 20% em relação à média das 4 semanas anteriores; identificar pessoas sem eventos e possíveis duplicidades.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **RF-06**                    | Consistência das datas              | Identificar eventos com datas potencialmente inválidas, como data\_evento no futuro,outliers e acompanhar ocorrências com datas fora do período esperado para cada fonte. Monitorar a consistência temporal dos eventos e das fases dos participantes, identificando situações como eventos anteriores à data de nascimento, consultas puerperais anteriores ao parto e outras combinações de datas incompatíveis. Acompanhar também eventos registrados fora da janela esperada da gestação, diferenciando os casos previstos pelas regras dos modelos daqueles que podem indicar inconsistências nos dados. O volume e a evolução dessas ocorrências deverão ser apresentados no painel para apoiar a investigação de possíveis problemas nas fontes ou no processamento dos dados. |
| **RF-07**                    | Vacinação (mart\_cit\_\_vacinacao)  | Monitorar o volume e a série histórica de registros de D3 de pentavalente na fonte consolidada; identificar variações de nome de vacina não contempladas pelo filtro do modelo; acompanhar a cobertura de D3 entre as crianças da população-alvo; e exibir o volume e a taxa de registros descartados, discriminados pelo motivo da exclusão, incluindo situação Não aplicada e data de aplicação nula. A série histórica das taxas de descarte deverá permitir identificar variações atípicas que possam indicar alterações na fonte de dados, no padrão de registro ou na integração com o mart\_cit\_\_vacinacao.                                                                                                                                                                  |
| **RF-08**                    | Testes rápidos                      | Monitorar o volume de testes rápidos de HIV, sífilis, hepatite B e hepatite C registrados nas fontes utilizadas pelo modelo; identificar diferenças entre os registros de procedimentos clínicos e os registros de resultados de testes rápidos via API e backup;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **RF-09**                    | Execução dos modelos                | Acompanhar a data e hora das execuções dos modelos publico\_alvo e eventos, sinalizando visualmente no painel execuções com intervalo superior a 25 horas e variações de volume acima de ±5% entre execuções consecutivas. Os alertas serão exibidos no próprio painel para apoiar a identificação de possíveis falhas ou comportamentos anômalos na atualização dos modelos.                                                                                                                                                                                                                                                                                                                                                                                                         |
| **RF-10**                    | Fases de gestação                   | Monitorar volumes de Gestação/Puerpério, datas nulas ou futuras, múltiplas gestações ativas e comportamento das novas gestações.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **RF-11**                    | Cobertura do cadastro Vitacare      | Monitorar datas de nascimento inválidas, CPF inválido, crianças que não chegam à população-alvo e crescimento do cadastro.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **RF-12**                    | Anomalias e alertas                 | Concentrar alertas ativos por severidade e categoria, manter histórico e permitir registrar alertas investigados ou esperados.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **RF-14**                    | Filtros globais                     | Permitir filtros por período, público-alvo (infância, gestação e puerpério), tabela-fonte, tipo de evento, granularidade temporal e unidade de saúde.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **RF-15**                    | Unidade de saúde                    | Analisar população e eventos por CNES/unidade; alertar queda superior a 30% do histórico da unidade. Para ausência de eventos, sinalizar por faixas: ausência por 24h, 48h e 72h, com severidade crescente conforme o tempo sem dados.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **RF-16**                    | Evento x segmento                   | Cruzar tipo\_evento e tipo\_publico, sinalizando combinações incompatíveis ou improváveis e permitindo investigação dos registros afetados.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **RF-17**                    | Sequência da pentavalente           | Verificar, em mart\_cit\_\_vacinacao, se crianças com D3 registrada também possuem D1 e D2; sinalizar percentual com D3 mas sem D2 ou sem D1. Monitorar intervalo D2→D3, sinalizando valores inferiores a 28 dias ou superiores a 90 dias.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **RF-18**                    | Completude da saída                 | Monitorar nulos, inválidos e valores inesperados nos campos transmitidos em publico\_alvo e eventos, incluindo tipo\_publico, tipo\_evento, datas, CPF e distancia\_dias.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

# 5. Regras de alerta prioritárias

| **MonitoramentoRegra objetiva** |                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Freshness das fontes            | Atrasos > 1 dia, > 2 dias e > 7 dias.                                                                                                                                                                                                                                                              |
| Volume de base-fonte            | Variação > ±10% em relação à média móvel de 7 dias.                                                                                                                                                                                                                                                |
| População-alvo                  | Variação diária > ±5%.                                                                                                                                                                                                                                                                             |
| Eventos                         | Queda semanal > 20% em relação à média das 4 semanas anteriores. Considerar que o volume de eventos é naturalmente menor aos finais de semana. O cálculo da média e o limiar de alerta devem ser aplicados sobre semanas completas ou sobre dias úteis separadamente para evitar falsos positivos. |
| Execução dos modelos            | Intervalo entre execuções > 25 horas; variação de volume > ±5%.                                                                                                                                                                                                                                    |
| Unidades de saúde               | Queda de eventos > 30% do histórico da própria unidade ou 7 dias consecutivos sem eventos.                                                                                                                                                                                                         |
| Pentavalente                    | Intervalo entre doses consecutivas < 28 dias ou > 90 dias.                                                                                                                                                                                                                                         |

# 6. Filtros globais

- Período de referência (data única ou intervalo).
- Segmento: Gestação, Puerpério, Infância ou todos.
- Tabela-fonte.
- Tipo de evento.
- Granularidade temporal: diária, semanal ou mensal.
- Unidade de saúde (CNES).

# 7. Requisitos não funcionais

| **RequisitoEspecificação** |                                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Atualização                | Exibir a data/hora de referência dos dados apresentados. Nas telas de fontes, corresponde à última atualização da tabela-fonte. Nas telas de população-alvo e eventos, corresponde à última execução dos modelos DBT de saída. |
| Rastreabilidade            | Cada métrica deve ter fonte, campo e lógica de cálculo identificáveis.                                                                                                                                                         |
| Histórico de alertas       | Manter alertas ao longo do tempo, não apenas o estado atual.                                                                                                                                                                   |
| Desempenho                 | Telas de resumo e alertas devem ter carregamento rápido; referência atual: menos de 5 segundos.                                                                                                                                |
| Controle de acesso         | Dados individualizados por CPF devem ser restritos a perfis autorizados; métricas agregadas podem ser disponibilizadas aos perfis técnicos.                                                                                    |



# 8. Organização das telas

| **TelaFinalidade**        |                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| Visão Geral               | Saúde do pipeline: última atualização, volumes principais, alertas abertos e status dos modelos. |
| Fontes e Atualização      | Freshness, volume e comportamento das tabelas-fonte.                                             |
| População-alvo            | Volume por segmento, qualidade cadastral, janelas e anomalias de composição.                     |
| Eventos                   | Cobertura, volume, consistência temporal e tipos de evento por segmento.                         |
| Consistência entre Fontes | Vacinação Vitacare x SIPNI e testes rápidos pelas diferentes rotas.                              |
| Unidades                  | Anomalias territoriais e unidades com queda ou ausência de eventos.                              |
| Alertas                   | Lista consolidada, severidade, histórico e situação da investigação.                             |
| SMS x Iplanrio            | Comparativo dos totais e histórico de divergências.                                              |



### Funcionalidade futura: reprodução das regras dos protocolos

Como funcionalidade futura, o painel poderá permitir o acompanhamento das regras dos protocolos da SMS implementadas nos modelos da Iplanrio. A proposta é utilizar como referência os modelos SQL/dbt disponibilizados no repositório da Iplanrio, de forma a tornar visível no painel quais regras estão sendo aplicadas e possibilitar o monitoramento de seu comportamento ao longo do tempo.

Essa funcionalidade não teria como objetivo implementar, recalcular ou substituir os protocolos no ambiente da SMS. O cálculo oficial e a aplicação das regras continuariam sendo realizados pela Iplanrio. O painel teria caráter exclusivamente de acompanhamento, permitindo à equipe da SMS verificar se as regras dos protocolos sob nossa responsabilidade permanecem implementadas conforme o esperado.

# 9. Stack tecnológica

### Frontend

- **Next.js** — desenvolvimento da interface do painel.

### Backend (ORM)

- **FastAPI** — implementação da API e das regras de integração entre a interface e as fontes de dados.
- **SQLAlchemy** — ORM para acesso e manipulação dos dados persistidos pela aplicação.
- **Alembic** — gerenciamento e versionamento das migrações do banco de dados.

### Banco de dados

- **PostgreSQL** — banco de dados da aplicação, utilizado para persistência das informações necessárias ao funcionamento do painel.

### Fonte de dados analítica

- **BigQuery** — fonte dos dados analíticos do projeto e dos modelos monitorados pelo painel, com integração prevista ao backend derivado de modelos dbt
