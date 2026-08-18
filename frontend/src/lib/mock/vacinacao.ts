import type { VacinacaoItem, TesteRapido } from "./types";

function seed(n: number) {
  let x = Math.sin(n + 7) * 10000;
  return x - Math.floor(x);
}

export function gerarSerieVacinacao(semanas: number): VacinacaoItem[] {
  const hoje = new Date("2026-08-17");
  return Array.from({ length: semanas }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - (semanas - 1 - i) * 7);
    const data = d.toISOString().slice(0, 10);
    const r = seed(i);
    const total_d3 = Math.round(620 + r * 80);
    const d3_sipni = Math.round(total_d3 * 0.62);
    const d3_vitacare = total_d3 - d3_sipni;
    const descartados_nao_aplicada = Math.round(total_d3 * 0.04 + seed(i + 1) * 5);
    const descartados_data_nula = Math.round(total_d3 * 0.02 + seed(i + 2) * 3);
    const descartados_outros = Math.round(total_d3 * 0.01 + seed(i + 3) * 2);
    const total_descartados = descartados_nao_aplicada + descartados_data_nula + descartados_outros;
    return {
      data,
      total_d3,
      d3_vitacare,
      d3_sipni,
      descartados_nao_aplicada,
      descartados_data_nula,
      descartados_outros,
      taxa_descarte_pct: Math.round((total_descartados / (total_d3 + total_descartados)) * 1000) / 10,
    };
  });
}

export const serieVacinacao12sem = gerarSerieVacinacao(12);

export const pentavalenteSequencia = {
  criancas_com_d3: 3_208,
  com_d3_e_d2_e_d1: 3_041,
  com_d3_sem_d2: 94,
  com_d3_sem_d1: 167,
  intervalo_d2_d3_ok: 2_891,
  intervalo_d2_d3_menor_28d: 38,
  intervalo_d2_d3_maior_90d: 279,
  nomes_nao_mapeados: ["Pentavac SD", "DTP+Hib+HepB", "Pentavalente Farmácia"],
};

export const cobertura_d3 = {
  criancas_alvo: 140_124,
  com_d3_registrado: 3_208,
  cobertura_pct: 2.3,
};

export function gerarSerieTestes(semanas: number): TesteRapido[] {
  const hoje = new Date("2026-08-17");
  return Array.from({ length: semanas }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - (semanas - 1 - i) * 7);
    const data = d.toISOString().slice(0, 10);
    const r = seed(i + 50);
    return {
      data,
      hiv_procedimento: Math.round(2_200 + r * 200),
      hiv_testerapido: Math.round(1_900 + seed(i + 51) * 180),
      sifilis_procedimento: Math.round(2_900 + r * 250),
      sifilis_testerapido: Math.round(2_600 + seed(i + 52) * 220),
      hepb_procedimento: Math.round(1_900 + r * 150),
      hepb_testerapido: Math.round(1_700 + seed(i + 53) * 130),
      hepc_procedimento: Math.round(1_300 + r * 120),
      hepc_testerapido: Math.round(1_100 + seed(i + 54) * 100),
    };
  });
}

export const serieTestes12sem = gerarSerieTestes(12);

export const divergenciaTesteAtual = {
  hiv: { procedimento: 2_184, testerapido: 1_921, diferenca: 263, pct: 12.1 },
  sifilis: { procedimento: 2_890, testerapido: 2_612, diferenca: 278, pct: 9.6 },
  hepb: { procedimento: 1_901, testerapido: 1_714, diferenca: 187, pct: 9.8 },
  hepc: { procedimento: 1_308, testerapido: 1_109, diferenca: 199, pct: 15.2 },
};
