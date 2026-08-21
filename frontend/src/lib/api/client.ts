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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`${API_URL}/api${path}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
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
  tipo?: "consolidada" | "padrao" | "paciente";
  ultima_atualizacao: string | null;
  volume: number | null;
  volume_atual_7d: number | null;
  variacao_pct: number | null;
  media_7d: number | null;
  volume_por_origem: Record<string, number> | null;
  horas_sem_atualizacao: number | null;
  severidade: "ok" | "aviso" | "alerta" | "critico";
  erro?: string;
  // Campos exclusivos da fonte Vitacare - Pacientes (tipo "paciente")
  cadastros_semana_atual?: number;
  media_4_semanas?: number;
  variacao_cadastros?: number | null;
  severidade_cadastros?: "ok" | "aviso" | "alerta" | "critico";
}

export interface ExecucaoModeloAPI {
  modelo: string;
  ultima_execucao: string | null;
  ultimo_dado: string | null;
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

export interface ConsistenciaPopulacaoAPI {
  cpfs_multiplos_segmentos: number;
  cpfs_tres_segmentos: number;
  taxa_sobreposicao: number;
  total_cpfs: number;
  duplicidades_mesmo_segmento: number;
  combinacoes: { segmentos: string; quantidade_cpfs: number }[];
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
  encerradas_sem_fechamento: number;
  ativas_dpp_ultrapassada: number;
  multiplas_gestacoes_ativas: number;
  sem_equipe: number;
}

export interface PerfilInfanciaAPI {
  faixa_0_1: number;
  faixa_1_2: number;
  faixa_2_4: number;
  faixa_4_6: number;
  completam_6_anos_30d: number;
  nascimentos_30d: number;
  sem_cpf_menores_6: number;
}

export interface MovimentacaoInfanciaAPI {
  entraram: number;
  sairam: number;
  saldo: number;
  media_entradas_4_semanas: number;
  media_saidas_4_semanas: number;
  variacao_entradas: number | null;
  variacao_saidas: number | null;
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
    consistencia: () => get<ConsistenciaPopulacaoAPI>("/populacao/consistencia"),
    entradasSaidas: (semanas = 12) => get<EntradaSaidaAPI[]>(`/populacao/entradas-saidas?semanas=${semanas}`),
    gestacoes: () => get<GestacaoMonitoramentoAPI>("/populacao/gestacoes"),
    perfilInfancia: () => get<PerfilInfanciaAPI>("/populacao/perfil-infancia"),
    movimentacaoInfancia: () => get<MovimentacaoInfanciaAPI>("/populacao/movimentacao-infancia"),
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
