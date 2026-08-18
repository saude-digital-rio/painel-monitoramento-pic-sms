import type { FonteStatus, ExecucaoModelo } from "./types";

export const fontesStatus: FonteStatus[] = [
  {
    nome: "Vitacare - Atendimentos",
    tabela: "raw_prontuario_vitacare__atendimento",
    ultima_atualizacao: "2026-08-17T04:32:00",
    volume: 4_821_093,
    variacao_pct: 0.8,
    media_7d: 4_780_000,
    severidade: "ok",
    horas_sem_atualizacao: 11,
  },
  {
    nome: "Vitacare - Procedimentos",
    tabela: "raw_prontuario_vitacare_historico__procedimentos_clinicos",
    ultima_atualizacao: "2026-08-15T22:14:00",
    volume: 1_203_441,
    variacao_pct: -12.4,
    media_7d: 1_374_000,
    severidade: "critico",
    horas_sem_atualizacao: 42,
  },
  {
    nome: "Vitacare - Acto (ponte)",
    tabela: "raw_prontuario_vitacare_historico__acto",
    ultima_atualizacao: "2026-08-15T22:14:00",
    volume: 2_108_772,
    variacao_pct: -2.1,
    media_7d: 2_153_000,
    severidade: "critico",
    horas_sem_atualizacao: 42,
  },
  {
    nome: "Vitacare - Testes Rápidos",
    tabela: "raw_prontuario_vitacare_historico__testerapido",
    ultima_atualizacao: "2026-08-15T22:14:00",
    volume: 389_201,
    variacao_pct: -1.8,
    media_7d: 396_000,
    severidade: "critico",
    horas_sem_atualizacao: 42,
  },
  {
    nome: "Vitacare - Pacientes",
    tabela: "int_prontuario_vitacare__paciente",
    ultima_atualizacao: "2026-08-17T05:01:00",
    volume: 2_941_588,
    variacao_pct: 0.3,
    media_7d: 2_932_000,
    severidade: "ok",
    horas_sem_atualizacao: 11,
  },
  {
    nome: "Vacinação (CIT/SIPNI)",
    tabela: "mart_cit__vacinacao",
    ultima_atualizacao: "2026-08-16T18:45:00",
    volume: 8_234_901,
    variacao_pct: 1.2,
    media_7d: 8_134_000,
    severidade: "aviso",
    horas_sem_atualizacao: 26,
  },
  {
    nome: "Gestações SUBPAV",
    tabela: "mart_bi_gestacoes__gestacoes",
    ultima_atualizacao: "2026-08-17T03:20:00",
    volume: 42_817,
    variacao_pct: 0.6,
    media_7d: 42_560,
    severidade: "ok",
    horas_sem_atualizacao: 13,
  },
  {
    nome: "Histórico Clínico - Episódios",
    tabela: "mart_historico_clinico__episodio",
    ultima_atualizacao: "2026-08-17T02:10:00",
    volume: 31_482_007,
    variacao_pct: 0.4,
    media_7d: 31_354_000,
    severidade: "ok",
    horas_sem_atualizacao: 14,
  },
];

export const execucoesModelos: ExecucaoModelo[] = [
  {
    modelo: "mart_iplanrio_pic__publico_alvo",
    ultima_execucao: "2026-08-17T06:05:00",
    penultima_execucao: "2026-08-16T05:58:00",
    intervalo_horas: 24.1,
    volume_atual: 184_203,
    volume_anterior: 183_891,
    variacao_pct: 0.17,
    severidade: "ok",
  },
  {
    modelo: "mart_iplanrio_pic__eventos",
    ultima_execucao: "2026-08-17T06:42:00",
    penultima_execucao: "2026-08-15T04:21:00",
    intervalo_horas: 50.3,
    volume_atual: 2_104_918,
    volume_anterior: 2_131_442,
    variacao_pct: -1.24,
    severidade: "critico",
  },
];

function gerarHistoricoVolume(base: number, dias: number, tendencia = 0.001) {
  const hoje = new Date("2026-08-17");
  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - (dias - 1 - i));
    const ruido = (Math.random() - 0.5) * base * 0.04;
    const trend = base * tendencia * i;
    return {
      data: d.toISOString().slice(0, 10),
      volume: Math.round(base + ruido + trend),
    };
  });
}

export const historicoVolumeFontes: Record<string, { data: string; volume: number }[]> = {
  raw_prontuario_vitacare__atendimento: gerarHistoricoVolume(4_750_000, 30),
  raw_prontuario_vitacare_historico__procedimentos_clinicos: [
    ...gerarHistoricoVolume(1_374_000, 24),
    { data: "2026-08-15", volume: 1_370_000 },
    { data: "2026-08-16", volume: 1_203_441 },
    { data: "2026-08-17", volume: 1_203_441 },
  ].slice(-30),
  mart_cit__vacinacao: gerarHistoricoVolume(8_100_000, 30, 0.0005),
  mart_bi_gestacoes__gestacoes: gerarHistoricoVolume(42_200, 30, 0.0003),
};
