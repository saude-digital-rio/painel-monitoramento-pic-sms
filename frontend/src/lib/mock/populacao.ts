import type { SerieTemporal, EntradaSaida } from "./types";

function seed(n: number) {
  let x = Math.sin(n + 1) * 10000;
  return x - Math.floor(x);
}

export function gerarSeriePopulacao(dias: number): SerieTemporal[] {
  const hoje = new Date("2026-08-17");
  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - (dias - 1 - i));
    const data = d.toISOString().slice(0, 10);
    const r = seed(i);
    const gestacao = Math.round(38_400 + r * 800 - 400 + i * 2);
    const puerperio = Math.round(5_900 + seed(i + 100) * 400 - 200 + i * 0.5);
    const infancia = Math.round(139_800 + seed(i + 200) * 1200 - 600 + i * 5);
    return { data, gestacao, puerperio, infancia, total: gestacao + puerperio + infancia };
  });
}

export const seriePopulacao30d = gerarSeriePopulacao(30);
export const seriePopulacao90d = gerarSeriePopulacao(90);

export const populacaoAtual = {
  gestacao: 38_712,
  puerperio: 5_984,
  infancia: 140_124,
  total: 184_820,
  cpf_sobreposicao: 43,
  data_referencia: "2026-08-17T06:05:00",
};

export const janelasTemporais = {
  gestacao: {
    total: 38_712,
    duracao_zero_negativa: 2,
    acima_300_dias: 18,
    media_duracao_dias: 174,
  },
  puerperio: {
    total: 5_984,
    diferente_45_dias: 31,
    media_duracao_dias: 44.8,
  },
  infancia: {
    total: 140_124,
    diferente_6_anos: 12,
    media_duracao_dias: 2188,
  },
};

export function gerarEntradaSaida(semanas: number): EntradaSaida[] {
  const resultado: EntradaSaida[] = [];
  const hoje = new Date("2026-08-17");
  const segmentos = ["Gestacao", "Puerperio", "Infancia"] as const;
  for (let w = semanas - 1; w >= 0; w--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - w * 7);
    const data = d.toISOString().slice(0, 10);
    for (const seg of segmentos) {
      const r = seed(w * 10 + segmentos.indexOf(seg));
      const base = seg === "Gestacao" ? 320 : seg === "Puerperio" ? 80 : 650;
      resultado.push({
        data,
        segmento: seg,
        entradas: Math.round(base + r * base * 0.3),
        saidas_encerramento: Math.round(base * 0.7 + r * base * 0.15),
        saidas_expiracao: Math.round(base * 0.15 + r * base * 0.05),
        saidas_desaparecimento: Math.round(base * 0.05 + r * base * 0.02),
      });
    }
  }
  return resultado;
}

export const entradaSaida12sem = gerarEntradaSaida(12);

export const cadastroQualidade = {
  total_pacientes: 2_941_588,
  nascimento_invalido: 1_243,
  cpf_invalido: 4_891,
  sem_cpf: 23_441,
  criancas_sem_populacao_alvo: 8_204,
  crescimento_mensal: 12_450,
  cadastro_permanente: 2_198_001,
};

export const gestacoesMonitoramento = {
  gestacoes_ativas: 38_712,
  puerperio_ativo: 5_984,
  data_nula: 34,
  data_futura: 8,
  multiplas_gestacoes_ativas: 12,
  novas_gestacoes_semana: 287,
  encerradas_semana: 268,
};
