"use client";

import { useState } from "react";
import { SeveridadeBadge } from "@/components/ui/Badge";
import { FreshnessBar } from "@/components/ui/FreshnessBar";
import { FonteDetalheModal } from "@/components/ui/FonteDetalheModal";
import type { FonteStatusAPI } from "@/lib/api/client";

interface Props {
  fontes: FonteStatusAPI[];
}

export function FontesStatusCard({ fontes }: Props) {
  const [selecionada, setSelecionada] = useState<FonteStatusAPI | null>(null);

  return (
    <>
      <div className="divide-y divide-gray-50">
        {fontes.map((fonte) => (
          <button
            key={fonte.tabela}
            className="w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors"
            onClick={() => setSelecionada(fonte)}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{fonte.nome}</p>
                {fonte.cadencia === "mensal" && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-medium">mensal</span>
                )}
              </div>
              <SeveridadeBadge severidade={fonte.severidade} />
            </div>
            <div className="flex flex-col gap-y-0.5 mb-1.5">
              <span className="text-[11px] text-gray-400 font-mono truncate">
                <span className="text-gray-300 select-none">Modelo </span>{fonte.tabela}
              </span>
              {fonte.dataset && fonte.table_id && (
                <span className="text-[11px] font-mono truncate">
                  <span className="text-gray-300 select-none">Tabela </span>
                  <span className="text-gray-400">{fonte.dataset}.</span>
                  <span className="text-gray-600 font-medium">{fonte.table_id}</span>
                </span>
              )}
            </div>
            {fonte.ultima_atualizacao && fonte.horas_sem_atualizacao !== null ? (
              <FreshnessBar
                horas={fonte.horas_sem_atualizacao}
                severidade={fonte.severidade}
                ultimaAtualizacao={fonte.ultima_atualizacao}
              />
            ) : (
              <p className="text-xs text-gray-400">{fonte.erro ?? "Sem dados"}</p>
            )}
            {fonte.variacao_pct !== null && (fonte.variacao_pct < -5 || fonte.variacao_pct > 50) && (
              <p className={`text-xs mt-0.5 ${fonte.variacao_pct < 0 ? "text-red-600" : "text-yellow-600"}`}>
                Variação: {fonte.variacao_pct > 0 ? "+" : ""}{fonte.variacao_pct.toFixed(1)}% vs média 7d
              </p>
            )}
          </button>
        ))}
      </div>

      {selecionada && (
        <FonteDetalheModal fonte={selecionada} onClose={() => setSelecionada(null)} />
      )}
    </>
  );
}
