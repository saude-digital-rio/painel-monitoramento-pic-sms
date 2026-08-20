export type Severidade = "critico" | "alerta" | "aviso" | "ok";
export type Segmento = "Gestacao" | "Puerperio" | "Infancia";
export type TipoEvento =
  | "Consulta"
  | "Visita Domiciliar"
  | "Teste rápido - HIV"
  | "Teste rápido - Sífilis"
  | "Teste rápido - Hepatite B"
  | "Teste rápido - Hepatite C"
  | "Vacina - Pentavalente - D3"
  | "Diagnóstico - HIV"
  | "Diagnóstico - Sífilis"
  | "Diagnóstico - Hepatite B"
  | "Diagnóstico - Hepatite C";

export interface FonteStatus {
  nome: string;
  tabela: string;
  ultima_atualizacao: string;
  volume: number;
  volume_atual_7d?: number | null;
  variacao_pct: number;
  media_7d: number;
  severidade: Severidade;
  horas_sem_atualizacao: number;
}

export interface ExecucaoModelo {
  modelo: string;
  ultima_execucao: string;
  penultima_execucao: string;
  intervalo_horas: number;
  volume_atual: number;
  volume_anterior: number;
  variacao_pct: number;
  severidade: Severidade;
}

export interface SerieTemporal {
  data: string;
  gestacao: number;
  puerperio: number;
  infancia: number;
  total: number;
}

export interface EntradaSaida {
  data: string;
  segmento: Segmento;
  entradas: number;
  saidas_encerramento: number;
  saidas_expiracao: number;
  saidas_desaparecimento: number;
}

export interface Alerta {
  id: string;
  categoria: string;
  descricao: string;
  severidade: Severidade;
  data: string;
  tabela: string;
  segmento?: Segmento;
  investigado: boolean;
  esperado: boolean;
  notas?: string;
}

export interface Unidade {
  cnes: string;
  nome: string;
  ap: string;
  eventos_7d: number;
  eventos_media_hist: number;
  variacao_pct: number;
  ultima_atividade: string;
  horas_sem_evento: number;
  severidade: Severidade;
}

export interface SerieEvento {
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

export interface VacinacaoItem {
  data: string;
  total_d3: number;
  d3_vitacare: number;
  d3_sipni: number;
  descartados_nao_aplicada: number;
  descartados_data_nula: number;
  descartados_outros: number;
  taxa_descarte_pct: number;
}

export interface TesteRapido {
  data: string;
  hiv_procedimento: number;
  hiv_testerapido: number;
  sifilis_procedimento: number;
  sifilis_testerapido: number;
  hepb_procedimento: number;
  hepb_testerapido: number;
  hepc_procedimento: number;
  hepc_testerapido: number;
}
