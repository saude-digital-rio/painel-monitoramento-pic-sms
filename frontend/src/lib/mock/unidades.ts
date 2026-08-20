import type { Unidade } from "./types";

export const unidades: Unidade[] = [
  { cnes: "2269822", nome: "CMS Ernani Agrícola", ap: "AP 1.0", eventos_7d: 0, eventos_media_hist: 312, variacao_pct: -100, ultima_atividade: "2026-08-10T14:22:00", horas_sem_evento: 168, severidade: "critico" },
  { cnes: "2269830", nome: "CMS Heitor Beltrão", ap: "AP 2.1", eventos_7d: 98, eventos_media_hist: 487, variacao_pct: -79.9, ultima_atividade: "2026-08-16T09:11:00", horas_sem_evento: 21, severidade: "critico" },
  { cnes: "2269849", nome: "CF Rinaldo de Lamare", ap: "AP 2.2", eventos_7d: 1_204, eventos_media_hist: 1_380, variacao_pct: -12.8, ultima_atividade: "2026-08-17T08:04:00", horas_sem_evento: 1, severidade: "aviso" },
  { cnes: "2269857", nome: "CMS Paulo Cavalcânti", ap: "AP 3.1", eventos_7d: 2_104, eventos_media_hist: 2_200, variacao_pct: -4.4, ultima_atividade: "2026-08-17T09:30:00", horas_sem_evento: 1, severidade: "ok" },
  { cnes: "2269865", nome: "CF Waldemar Berardinelli", ap: "AP 3.2", eventos_7d: 1_802, eventos_media_hist: 1_890, variacao_pct: -4.7, ultima_atividade: "2026-08-17T07:55:00", horas_sem_evento: 2, severidade: "ok" },
  { cnes: "2269873", nome: "CMS Américo Veloso", ap: "AP 3.3", eventos_7d: 1_440, eventos_media_hist: 1_510, variacao_pct: -4.6, ultima_atividade: "2026-08-17T08:12:00", horas_sem_evento: 1, severidade: "ok" },
  { cnes: "2269881", nome: "CMS Álvaro Ramos", ap: "AP 3.3", eventos_7d: 0, eventos_media_hist: 278, variacao_pct: -100, ultima_atividade: "2026-08-09T16:30:00", horas_sem_evento: 192, severidade: "critico" },
  { cnes: "2271181", nome: "CF Marcolino Candau", ap: "AP 4.0", eventos_7d: 2_890, eventos_media_hist: 3_100, variacao_pct: -6.8, ultima_atividade: "2026-08-17T09:01:00", horas_sem_evento: 1, severidade: "ok" },
  { cnes: "2271203", nome: "CF Oswaldo Cruz", ap: "AP 4.0", eventos_7d: 3_420, eventos_media_hist: 3_380, variacao_pct: 1.2, ultima_atividade: "2026-08-17T09:22:00", horas_sem_evento: 1, severidade: "ok" },
  { cnes: "2271211", nome: "CMS Padre Velloso", ap: "AP 4.0", eventos_7d: 490, eventos_media_hist: 820, variacao_pct: -40.2, ultima_atividade: "2026-08-17T06:44:00", horas_sem_evento: 2, severidade: "critico" },
  { cnes: "2271238", nome: "CMS Léa Nino", ap: "AP 5.1", eventos_7d: 1_102, eventos_media_hist: 1_150, variacao_pct: -4.2, ultima_atividade: "2026-08-17T08:30:00", horas_sem_evento: 1, severidade: "ok" },
  { cnes: "2271246", nome: "CMS Piraquara", ap: "AP 5.2", eventos_7d: 780, eventos_media_hist: 790, variacao_pct: -1.3, ultima_atividade: "2026-08-17T09:10:00", horas_sem_evento: 1, severidade: "ok" },
  { cnes: "2271254", nome: "CF Marcos Valadão", ap: "AP 5.3", eventos_7d: 1_640, eventos_media_hist: 1_700, variacao_pct: -3.5, ultima_atividade: "2026-08-17T08:48:00", horas_sem_evento: 1, severidade: "ok" },
  { cnes: "2271262", nome: "CMS Mário Rodrigues", ap: "AP 5.3", eventos_7d: 212, eventos_media_hist: 340, variacao_pct: -37.6, ultima_atividade: "2026-08-16T14:20:00", horas_sem_evento: 19, severidade: "critico" },
  { cnes: "2271270", nome: "CF Ernesto Zeferino Tibau", ap: "AP 5.3", eventos_7d: 920, eventos_media_hist: 940, variacao_pct: -2.1, ultima_atividade: "2026-08-17T09:05:00", horas_sem_evento: 1, severidade: "ok" },
];

export const aps = ["AP 1.0", "AP 2.1", "AP 2.2", "AP 3.1", "AP 3.2", "AP 3.3", "AP 4.0", "AP 5.1", "AP 5.2", "AP 5.3"];

export function gerarSerieUnidade(cnes: string, semanas: number) {
  const unidade = unidades.find(u => u.cnes === cnes);
  const base = unidade?.eventos_media_hist ?? 500;
  const hoje = new Date("2026-08-17");
  return Array.from({ length: semanas }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - (semanas - 1 - i) * 7);
    const data = d.toISOString().slice(0, 10);
    const r = Math.sin(i * 1.3 + Number(cnes.slice(-2))) * 0.1;
    return { data, eventos: Math.max(0, Math.round(base * (1 + r))) };
  });
}
