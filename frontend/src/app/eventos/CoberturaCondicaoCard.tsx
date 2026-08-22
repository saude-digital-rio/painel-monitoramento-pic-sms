"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import type { CoberturaGestantesAPI } from "@/lib/api/client";

const CONDICAO_COLOR: Record<string, string> = {
  "HIV": "#8b5cf6",
  "Sífilis": "#f59e0b",
  "Hepatite B": "#ef4444",
  "Hepatite C": "#ec4899",
};

type Filtro = "ambos" | "testes" | "diagnosticos";

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "ambos", label: "Ambos" },
  { value: "testes", label: "Teste Rápido" },
  { value: "diagnosticos", label: "Diagnósticos" },
];

type Props = {
  total_gestantes: number;
  evidencia_por_condicao: CoberturaGestantesAPI["evidencia_por_condicao"];
};

export function CoberturaCondicaoCard({ total_gestantes, evidencia_por_condicao }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("ambos");

  function getValores(c: Props["evidencia_por_condicao"][number]) {
    if (filtro === "testes") return { n: c.com_teste, pct: c.pct_teste };
    if (filtro === "diagnosticos") return { n: c.com_diagnostico, pct: c.pct_diagnostico };
    return { n: c.com_evidencia, pct: c.pct };
  }

  const tooltipText =
    filtro === "testes"
      ? "Gestantes com ao menos um teste rápido registrado para cada condição."
      : filtro === "diagnosticos"
        ? "Gestantes com diagnóstico de IST registrado, independentemente de teste rápido."
        : "Gestantes com ao menos um teste rápido ou diagnóstico registrado para cada condição.";

  return (
    <Card title="Cobertura por condição" tooltip={tooltipText}>
      {/* Toggle */}
      <div className="flex gap-1 mb-4 p-0.5 bg-gray-100 rounded-lg w-fit">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filtro === f.value
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 mb-4">
        Base: <span className="font-semibold text-gray-600">{total_gestantes.toLocaleString("pt-BR")}</span> gestantes
      </p>

      <div className="space-y-4">
        {evidencia_por_condicao.map((c) => {
          const { n, pct } = getValores(c);
          return (
            <div key={c.condicao}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{c.condicao}</span>
                <span className="text-gray-500 text-xs">
                  <span className="font-bold text-gray-800">{n.toLocaleString("pt-BR")}</span>
                  {" "}gestantes{" "}
                  <span className="font-bold" style={{ color: CONDICAO_COLOR[c.condicao] }}>{pct}%</span>
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: CONDICAO_COLOR[c.condicao] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
