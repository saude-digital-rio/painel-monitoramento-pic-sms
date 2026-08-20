/**
 * Cliente da API FastAPI.
 *
 * Tenta buscar do backend. Se falhar (modo offline / dev sem backend),
 * retorna null e as páginas fazem fallback para os dados mock.
 *
 * Variável de ambiente: NEXT_PUBLIC_API_URL (ex: http://localhost:8000)
 */

const API_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    : (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api${path}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── Tipos compartilhados ─────────────────────────────────────────────────────

export type Severidade = "critico" | "alerta" | "aviso" | "ok";

// ─── Tipos de resposta ────────────────────────────────────────────────────────

export interface FonteStatusAPI {
  nome: string;
  tabela: string;
  dataset: string;
  table_id: string;
  cadencia: "diaria" | "mensal";
  ultima_atualizacao: string | null;
  volume: number | null;
  volume_atual_7d: number | null;
  variacao_pct: number | null;
  media_7d: number | null;
  horas_sem_atualizacao: number | null;
  severidade: "ok" | "aviso" | "alerta" | "critico";
  erro?: string;
}

export interface ExecucaoModeloAPI {
  modelo: string;
  ultima_execucao: string | null;
  intervalo_horas: number;
  volume_atual: number;
  severidade: "ok" | "aviso" | "alerta" | "critico";
  erro?: string;
}

export interface PopulacaoAtualAPI {
  gestacao: number;
  puerperio: number;
  infancia: number;
  total: number;
  cpf_sobreposicao: number;
  data_referencia: string | null;
}

export interface SeriePopulacaoAPI {
  data: string;
  gestacao: number;
  puerperio: number;
  infancia: number;
  total: number;
}

export interface JanelasTemporaisAPI {
  gestacao: { total: number; duracao_zero_negativa: number; acima_300_dias: number; media_duracao_dias: number };
  puerperio: { total: number; diferente_45_dias: number; media_duracao_dias: number };
  infancia: { total: number; diferente_6_anos: number; media_duracao_dias: number };
}

export interface SerieEventoAPI {
  data: string;
  consulta: number;
  visita: number;
  teste_hiv: number;
  teste_sifilis: number;
  teste_hepb: number;
  teste_hepc: number;
  vacina_d3: number;
  diagnostico: number;
}

export interface CoberturaAPI {
  segmento: string;
  total: number;
  com_evento: number;
  sem_evento: number;
  cobertura_pct: number;
}

export interface AlertaAPI {
  id: string;
  categoria: string;
  descricao: string;
  severidade: "ok" | "aviso" | "alerta" | "critico";
  data: string;
  tabela: string;
  segmento?: string;
  investigado: boolean;
  esperado: boolean;
  notas?: string;
}

export interface VacinacaoItemAPI {
  data: string;
  total_d3: number;
  d3_sipni: number;
  d3_vitacare: number;
  descartados_nao_aplicada: number;
  descartados_data_nula: number;
  descartados_outros: number;
  taxa_descarte_pct: number;
}

export interface PentavalenteAPI {
  criancas_com_d3: number;
  com_d3_e_d2_e_d1: number;
  com_d3_sem_d2: number;
  com_d3_sem_d1: number;
  intervalo_d2_d3_ok: number;
  intervalo_d2_d3_menor_28d: number;
  intervalo_d2_d3_maior_90d: number;
  nomes_nao_mapeados: string[];
}

export interface CoberturaDoisAPI {
  criancas_alvo: number;
  com_d3_registrado: number;
  cobertura_pct: number;
}

export interface DivergenciaTestesAPI {
  hiv: { procedimento: number; testerapido: number; diferenca: number; pct: number };
  sifilis: { procedimento: number; testerapido: number; diferenca: number; pct: number };
  hepb: { procedimento: number; testerapido: number; diferenca: number; pct: number };
  hepc: { procedimento: number; testerapido: number; diferenca: number; pct: number };
}

export interface EntradaSaidaAPI {
  data: string;
  segmento: string;
  entradas: number;
}

export interface GestacaoMonitoramentoAPI {
  gestacoes_ativas: number;
  puerperio_ativo: number;
  data_nula: number;
  data_futura: number;
  multiplas_gestacoes_ativas: number;
  novas_gestacoes_semana: number;
  encerradas_semana: number;
}

export interface CadastroQualidadeAPI {
  total_pacientes: number;
  nascimento_invalido: number;
  cpf_invalido: number;
  sem_cpf: number;
  cadastro_permanente: number;
  crescimento_mensal: number;
  criancas_sem_populacao_alvo: number | null;
}

export interface UnidadeAPI {
  cnes: string;
  nome: string;
  ap: string | null;
  eventos_7d: number;
  eventos_media_hist: number;
  variacao_pct: number;
  ultima_atividade: string | null;
  horas_sem_evento: number;
  severidade: "ok" | "aviso" | "alerta" | "critico";
}

// ─── Funções de busca ─────────────────────────────────────────────────────────

export const api = {
  fontes: {
    status: () => get<FonteStatusAPI[]>("/fontes/status"),
    modelos: () => get<ExecucaoModeloAPI[]>("/fontes/modelos"),
    historico: (dataset: string, table_id: string, dias = 30) =>
      get<{ data: string; volume: number }[]>(`/fontes/historico?dataset=${dataset}&table_id=${table_id}&dias=${dias}`),
  },
  populacao: {
    atual: () => get<PopulacaoAtualAPI>("/populacao/atual"),
    serie: (dias = 30) => get<SeriePopulacaoAPI[]>(`/populacao/serie?dias=${dias}`),
    janelas: () => get<JanelasTemporaisAPI>("/populacao/janelas"),
    entradasSaidas: (semanas = 12) => get<EntradaSaidaAPI[]>(`/populacao/entradas-saidas?semanas=${semanas}`),
    gestacoes: () => get<GestacaoMonitoramentoAPI>("/populacao/gestacoes"),
    cadastro: () => get<CadastroQualidadeAPI>("/populacao/cadastro"),
    sobreposicao: () => get<{ cpf: string; segmentos: string[] }[]>("/populacao/sobreposicao"),
  },
  eventos: {
    serie: (dias = 30) => get<SerieEventoAPI[]>(`/eventos/serie?dias=${dias}`),
    cobertura: () => get<CoberturaAPI[]>("/eventos/cobertura"),
    consistenciaDatas: () => get<Record<string, number>>("/eventos/consistencia-datas"),
    eventoSegmento: () => get<{ tipo_evento: string; tipo_publico: string; count: number; compativel: boolean }[]>("/eventos/evento-segmento"),
    completude: () => get<Record<string, number>>("/eventos/completude"),
  },
  vacinacao: {
    serie: (semanas = 12) => get<VacinacaoItemAPI[]>(`/vacinacao/serie?semanas=${semanas}`),
    pentavalente: () => get<PentavalenteAPI>("/vacinacao/pentavalente"),
    testesRapidos: (semanas = 12) => get<Record<string, number | string>[]>(`/vacinacao/testes-rapidos?semanas=${semanas}`),
    coberturaDois: () => get<CoberturaDoisAPI>("/vacinacao/cobertura-d3"),
    divergenciaTestes: () => get<DivergenciaTestesAPI>("/vacinacao/divergencia-testes"),
  },
  unidades: {
    lista: () => get<UnidadeAPI[]>("/unidades"),
  },
  alertas: {
    lista: () => get<AlertaAPI[]>("/alertas"),
  },
};
