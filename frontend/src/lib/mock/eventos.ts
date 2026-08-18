import type { SerieEvento } from "./types";

function seed(n: number) {
  let x = Math.sin(n + 42) * 10000;
  return x - Math.floor(x);
}

function isDiasUtil(dateStr: string): boolean {
  const d = new Date(dateStr);
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

export function gerarSerieEventos(dias: number): SerieEvento[] {
  const hoje = new Date("2026-08-17");
  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - (dias - 1 - i));
    const data = d.toISOString().slice(0, 10);
    const util = isDiasUtil(data) ? 1 : 0.15;
    const r = seed(i);
    return {
      data,
      consulta: Math.round((2800 + r * 400) * util),
      visita: Math.round((1900 + seed(i + 1) * 300) * util),
      teste_hiv: Math.round((320 + seed(i + 2) * 60) * util),
      teste_sifilis: Math.round((410 + seed(i + 3) * 70) * util),
      teste_hepb: Math.round((280 + seed(i + 4) * 50) * util),
      teste_hepc: Math.round((190 + seed(i + 5) * 40) * util),
      vacina_d3: Math.round((88 + seed(i + 6) * 20) * util),
      diagnostico: Math.round((45 + seed(i + 7) * 15) * util),
    };
  });
}

export const serieEventos30d = gerarSerieEventos(30);
export const serieEventos90d = gerarSerieEventos(90);

export const cobertura = {
  gestacao: { total: 38_712, com_evento: 35_108, sem_evento: 3_604, cobertura_pct: 90.7 },
  puerperio: { total: 5_984, com_evento: 4_821, sem_evento: 1_163, cobertura_pct: 80.6 },
  infancia: { total: 140_124, com_evento: 112_408, sem_evento: 27_716, cobertura_pct: 80.2 },
};

export const consistenciaDatas = {
  eventos_futuro: 23,
  eventos_antes_nascimento: 14,
  consultas_puerperais_antes_parto: 7,
  eventos_fora_janela: 341,
  eventos_fora_janela_esperado: 298,
  eventos_fora_janela_anomalia: 43,
  evolucao_anomalias: [
    { semana: "2026-07-07", count: 38 },
    { semana: "2026-07-14", count: 41 },
    { semana: "2026-07-21", count: 35 },
    { semana: "2026-07-28", count: 39 },
    { semana: "2026-08-04", count: 44 },
    { semana: "2026-08-11", count: 43 },
  ],
};

export const eventoSegmento = [
  { tipo_evento: "Consulta", tipo_publico: "Gestacao", count: 18_420, compativel: true },
  { tipo_evento: "Consulta", tipo_publico: "Puerperio", count: 7_341, compativel: true },
  { tipo_evento: "Consulta", tipo_publico: "Infancia", count: 41_220, compativel: true },
  { tipo_evento: "Visita Domiciliar", tipo_publico: "Gestacao", count: 12_108, compativel: true },
  { tipo_evento: "Visita Domiciliar", tipo_publico: "Puerperio", count: 4_901, compativel: true },
  { tipo_evento: "Visita Domiciliar", tipo_publico: "Infancia", count: 28_441, compativel: true },
  { tipo_evento: "Teste rápido - HIV", tipo_publico: "Gestacao", count: 9_830, compativel: true },
  { tipo_evento: "Teste rápido - HIV", tipo_publico: "Puerperio", count: 1_204, compativel: true },
  { tipo_evento: "Teste rápido - HIV", tipo_publico: "Infancia", count: 120, compativel: false },
  { tipo_evento: "Teste rápido - Sífilis", tipo_publico: "Gestacao", count: 12_441, compativel: true },
  { tipo_evento: "Teste rápido - Sífilis", tipo_publico: "Puerperio", count: 1_881, compativel: true },
  { tipo_evento: "Teste rápido - Sífilis", tipo_publico: "Infancia", count: 84, compativel: false },
  { tipo_evento: "Vacina - Pentavalente - D3", tipo_publico: "Infancia", count: 3_208, compativel: true },
  { tipo_evento: "Vacina - Pentavalente - D3", tipo_publico: "Gestacao", count: 31, compativel: false },
  { tipo_evento: "Diagnóstico - HIV", tipo_publico: "Gestacao", count: 412, compativel: true },
  { tipo_evento: "Diagnóstico - Sífilis", tipo_publico: "Gestacao", count: 1_208, compativel: true },
  { tipo_evento: "Diagnóstico - Hepatite B", tipo_publico: "Gestacao", count: 231, compativel: true },
];

export const completudeEventos = {
  tipo_publico_nulo: 0,
  tipo_evento_nulo: 0,
  data_evento_nula: 12,
  cpf_nulo: 0,
  distancia_dias_nula: 24,
  distancia_dias_negativa: 8,
  inicio_fase_nulo: 3,
};
