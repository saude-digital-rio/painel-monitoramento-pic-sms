"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { SeveridadeBadge } from "@/components/ui/Badge";
import { FreshnessBar } from "@/components/ui/FreshnessBar";
import { FonteDetalheModal } from "@/components/ui/FonteDetalheModal";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { api, type FonteStatusAPI, type ExecucaoModeloAPI } from "@/lib/api/client";

export default function FontesPage() {
  const [fonteModal, setFonteModal] = useState<FonteStatusAPI | null>(null);
  const [fontes, setFontes] = useState<FonteStatusAPI[] | null>(null);
  const [modelos, setModelos] = useState<ExecucaoModeloAPI[] | null>(null);

  useEffect(() => {
    Promise.all([api.fontes.status(), api.fontes.modelos()]).then(([real, realM]) => {
      setFontes(real ?? []);
      setModelos(realM ?? []);
    });
  }, []);

  if (fontes === null || modelos === null) return <PageSkeleton />;

  return (
    <div>
      <Header
        title="Fontes e Atualização"
        subtitle="Freshness, volume e comportamento das tabelas-fonte"
        dataRef={fontes[0]?.ultima_atualizacao ?? undefined}
      />

      {/* Resumo execução modelos */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Modelos de saída (PIC)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {modelos.map((m) => (
            <div key={m.modelo} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Modelo</p>
                  <p className="text-sm font-mono font-semibold text-gray-800 mt-0.5 truncate">{m.modelo}</p>
                </div>
                <SeveridadeBadge severidade={m.severidade} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Última execução</p>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {m.ultima_execucao ? new Date(m.ultima_execucao).toLocaleString("pt-BR") : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Último dado disponível</p>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {m.ultimo_dado ? new Date(m.ultimo_dado).toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Intervalo desde execução</p>
                  <p className={`font-semibold mt-0.5 ${m.intervalo_horas > 25 ? "text-red-600" : "text-gray-800"}`}>
                    {m.intervalo_horas.toFixed(1)}h {m.intervalo_horas > 25 && "(⚠ > 25h)"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Volume atual</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{m.volume_atual.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela de fontes */}
      <Card title="Tabelas-fonte monitoradas" subtitle="Clique em uma linha para ver os detalhes" padding={false} tooltip="Tabelas BigQuery usadas pelo painel com volume atual, variação em relação à média de 7 dias e tempo desde a última atualização.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fonte / Tabela</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Volume</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Freshness</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {fontes.map((fonte) => {
                const volume = fonte.volume ?? 0;
                const horas = fonte.horas_sem_atualizacao ?? 0;
                return (
                  <tr
                    key={fonte.tabela}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => setFonteModal(fonte)}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-800">{fonte.nome}</p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        <span className="text-gray-300 select-none">Modelo </span>{fonte.tabela}
                      </p>
                      {fonte.dataset && fonte.table_id && (
                        <p className="text-[11px] font-mono mt-0.5">
                          <span className="text-gray-300 select-none">Tabela </span>
                          <span className="text-gray-400">{fonte.dataset}.</span>
                          <span className="text-gray-600 font-medium">{fonte.table_id}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-gray-700">
                      {volume.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3.5">
                      {fonte.ultima_atualizacao ? (
                        <FreshnessBar
                          horas={horas}
                          severidade={fonte.severidade}
                          ultimaAtualizacao={fonte.ultima_atualizacao}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">{fonte.erro ?? "Sem dados"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <SeveridadeBadge severidade={fonte.severidade} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {fonteModal && (
        <FonteDetalheModal fonte={fonteModal} onClose={() => setFonteModal(null)} />
      )}

      {/* Legenda de severidade */}
      <Card title="Regras de alerta de freshness" className="mt-6" tooltip="Critérios para classificar o status de cada fonte: aviso (24–48h sem atualização), alerta (48–72h) ou crítico (>72h ou variação >±10%).">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-yellow-800">Aviso</p>
              <p className="text-yellow-700 mt-0.5">24–48h sem atualização</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-orange-800">Alerta</p>
              <p className="text-orange-700 mt-0.5">48–72h sem atualização</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Crítico</p>
              <p className="text-red-700 mt-0.5">{">"}72h sem atualização ou variação {">"} ±10%</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
