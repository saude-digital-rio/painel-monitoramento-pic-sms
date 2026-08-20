"use client";

import { X } from "lucide-react";
import { SeveridadeBadge } from "./Badge";
import type { FonteStatusAPI, Severidade } from "@/lib/api/client";

function sevFreshness(horas: number | null, cadencia: string): Severidade {
  if (horas === null) return "alerta";
  if (cadencia === "mensal") return horas < 31 * 24 ? "ok" : "critico";
  if (horas < 24) return "ok";
  if (horas < 48) return "aviso";
  if (horas < 72) return "alerta";
  return "critico";
}

function sevVolume(variacao_pct: number | null): Severidade {
  if (variacao_pct === null) return "ok";
  if (variacao_pct < -10) return "critico";
  if (variacao_pct < -5) return "alerta";
  if (variacao_pct > 50) return "aviso";
  return "ok";
}

const ORDEM: Record<Severidade, number> = { ok: 0, aviso: 1, alerta: 2, critico: 3 };

function LinhaDiagnostico({ label, valor, sev, hideBadge }: { label: string; valor: string; sev: Severidade; hideBadge?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-start gap-2">
        <span className="text-sm font-medium text-gray-800 text-right">{valor}</span>
        {!hideBadge && <SeveridadeBadge severidade={sev} />}
      </div>
    </div>
  );
}

function LinhaInfo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-mono text-gray-700">{valor}</span>
    </div>
  );
}

function LimitesVolume() {
  return (
    <div className="py-1.5">
      <span className="text-xs text-gray-500">Limites</span>
      <div className="mt-1 space-y-1 pl-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400 shrink-0">quedas:</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">ok &gt; -5%</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-medium">alerta -5–10%</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">crítico &gt; -10%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400 shrink-0">altas:</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">ok &lt; +50%</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 font-medium">aviso &gt; +50%</span>
        </div>
      </div>
    </div>
  );
}

function LimitesFreshness({ cadencia }: { cadencia: string }) {
  if (cadencia === "mensal") {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-xs text-gray-500">Limites</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">ok &lt; 31d</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">crítico ≥ 31d</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-gray-500">Limites</span>
      <div className="flex items-center gap-1">
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">ok &lt; 24h</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 font-medium">aviso 24–48h</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-medium">alerta 48–72h</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">crítico &gt; 72h</span>
      </div>
    </div>
  );
}

interface Props {
  fonte: FonteStatusAPI;
  onClose: () => void;
}

export function FonteDetalheModal({ fonte, onClose }: Props) {
  const horas = fonte.horas_sem_atualizacao;
  const mensal = fonte.cadencia === "mensal";
  const consolidada = fonte.tipo === "consolidada";
  const semVolumeSev = mensal || consolidada;
  const sfresh = sevFreshness(horas, fonte.cadencia);
  const svol = semVolumeSev ? "ok" : sevVolume(fonte.variacao_pct);
  const motivo = semVolumeSev ? "freshness" : (ORDEM[sfresh] >= ORDEM[svol] ? "freshness" : "volume");

  let valorVolumeDiag: string;
  if (!semVolumeSev && fonte.variacao_pct !== null) {
    const sinal = fonte.variacao_pct > 0 ? "+" : "";
    valorVolumeDiag = `Variação semanal: ${sinal}${fonte.variacao_pct.toFixed(1)}%`;
  } else if (fonte.volume !== null) {
    valorVolumeDiag = `${fonte.volume.toLocaleString("pt-BR")} registros`;
  } else {
    valorVolumeDiag = "Sem dados";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{fonte.nome}</p>
            <p className="text-xs font-mono text-gray-400 mt-0.5 truncate">{fonte.tabela}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SeveridadeBadge severidade={fonte.severidade} />
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Diagnóstico */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Diagnóstico</p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <LinhaDiagnostico
                label="Freshness"
                valor={horas !== null ? `${horas.toFixed(1)}h sem atualização` : "Sem dados"}
                sev={sfresh}
              />
              <LinhaDiagnostico
                label="Volume"
                valor={valorVolumeDiag}
                sev={svol}
                hideBadge={mensal}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Severidade final determinada pelo <span className="font-medium text-gray-600">{motivo}</span>.
            </p>
          </div>

          {/* Freshness */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Freshness</p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
              <LinhaInfo label="Última atualização" valor={fonte.ultima_atualizacao ? new Date(fonte.ultima_atualizacao).toLocaleString("pt-BR") : "—"} />
              <LinhaInfo label="Sem atualização há" valor={horas !== null ? `${horas.toFixed(1)}h` : "—"} />
              <LinhaInfo label="Cadência esperada" valor={fonte.cadencia} />
              <LimitesFreshness cadencia={fonte.cadencia} />
            </div>
          </div>

          {/* Volume */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Volume</p>
            {consolidada ? (
              <div className="bg-gray-50 rounded-xl p-3">
                {/* Volume total em destaque */}
                <div className="flex items-center justify-between pb-3">
                  <span className="text-xs font-medium text-gray-600">Volume total</span>
                  <span className="text-xs font-semibold text-gray-800 font-mono">
                    {fonte.volume !== null ? fonte.volume.toLocaleString("pt-BR") : "—"}
                  </span>
                </div>

                {fonte.volume_por_origem && Object.keys(fonte.volume_por_origem).length > 0 && (() => {
                  const total = fonte.volume ?? 1;
                  const hist = fonte.volume_por_origem["historico"];
                  const cont = fonte.volume_por_origem["continuo"];
                  return (
                    <>
                      <div className="border-t border-gray-200 pt-3 mb-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Por origem</p>
                      </div>
                      {hist !== undefined && (
                        <div className="flex items-center justify-between py-1">
                          <span className="text-xs text-gray-500">Histórico (backup)</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-gray-700">{hist.toLocaleString("pt-BR")}</span>
                            <span className="text-[11px] text-gray-400 w-10 text-right">{(hist / total * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      )}
                      {cont !== undefined && (
                        <div className="flex items-center justify-between py-1">
                          <span className="text-xs text-gray-500">Contínuo (API)</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-gray-700">{cont.toLocaleString("pt-BR")}</span>
                            <span className="text-[11px] text-gray-400 w-10 text-right">{(cont / total * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : mensal ? (
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <LinhaInfo label="Volume atual" valor={fonte.volume !== null ? fonte.volume.toLocaleString("pt-BR") : "—"} />
                <p className="text-xs text-gray-500 leading-relaxed pt-1">
                  Esta fonte é atualizada por backup mensal com substituição dos dados existentes. Por isso, a tabela mantém apenas o estado atual e não permite comparar o volume com cargas anteriores.
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                {fonte.volume_atual_7d !== null && fonte.volume_atual_7d !== undefined ? (
                  <>
                    <LinhaInfo label="Semana atual (d-7 a hoje)" valor={Math.round(fonte.volume_atual_7d).toLocaleString("pt-BR")} />
                    <LinhaInfo label="Semana anterior (d-14 a d-7)" valor={fonte.media_7d !== null ? Math.round(fonte.media_7d).toLocaleString("pt-BR") : "—"} />
                  </>
                ) : (
                  <>
                    <LinhaInfo label="Volume total" valor={fonte.volume !== null ? fonte.volume.toLocaleString("pt-BR") : "—"} />
                    <LinhaInfo label="Média 7 dias anteriores" valor={fonte.media_7d !== null ? Math.round(fonte.media_7d).toLocaleString("pt-BR") : "—"} />
                  </>
                )}
                <LinhaInfo label="Variação" valor={fonte.variacao_pct !== null ? `${fonte.variacao_pct > 0 ? "+" : ""}${fonte.variacao_pct.toFixed(1)}%` : "—"} />
                <LimitesVolume />
              </div>
            )}
          </div>

          {/* Tabela BQ */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tabela BigQuery</p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
              <LinhaInfo label="Dataset" valor={fonte.dataset} />
              <LinhaInfo label="Tabela" valor={fonte.table_id} />
              <LinhaInfo label="Cadência" valor={fonte.cadencia} />
            </div>
          </div>

          {fonte.erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Erro</p>
              <p className="text-xs text-red-600">{fonte.erro}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
