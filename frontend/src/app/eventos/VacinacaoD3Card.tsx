"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { MultiBarChart } from "@/components/charts/BarChart";
import { api } from "@/lib/api/client";

const INTERVALOS = [
  { label: "4 sem", value: 4 },
  { label: "8 sem", value: 8 },
  { label: "12 sem", value: 12 },
  { label: "24 sem", value: 24 },
  { label: "1 ano", value: 52 },
];

export function VacinacaoD3Card() {
  const [semanas, setSemanas] = useState(12);
  const [dados, setDados] = useState<Record<string, number>[] | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    setDados(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.vacinacao.serie(semanas) as Promise<any[] | null>).then((d) => {
      setDados(d ?? []);
      setCarregando(false);
    });
  }, [semanas]);

  const dadosFiltrados = (dados ?? []).filter((d) => (d.d3_sipni ?? 0) + (d.d3_vitacare ?? 0) > 0);
  const totalSipni = dadosFiltrados.reduce((s, d) => s + (d.d3_sipni ?? 0), 0);
  const totalVitacare = dadosFiltrados.reduce((s, d) => s + (d.d3_vitacare ?? 0), 0);
  const totalGeral = totalSipni + totalVitacare;

  const origens = [
    { label: "SIPNI", value: totalSipni, color: "#10b981" },
    { label: "Vitacare", value: totalVitacare, color: "#8b5cf6" },
  ];

  return (
    <Card
      title="Volume semanal D3 pentavalente"
      tooltip="Doses D3 da vacina pentavalente registradas por semana, separadas por fonte (SIPNI e Vitacare)."
      className="h-full flex flex-col"
      contentClassName="flex flex-col flex-1"
    >
      {/* Filtro de intervalo */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {INTERVALOS.map((op) => (
          <button
            key={op.value}
            type="button"
            onClick={() => setSemanas(op.value)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              semanas === op.value
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="flex-1 min-h-[220px] bg-gray-50 rounded-xl animate-pulse" />
      ) : dados === null ? (
        <ApiErrorCard />
      ) : (
        <div className="flex flex-col flex-1">
          <div className="flex-1 min-h-[220px]">
            <MultiBarChart
              data={dadosFiltrados}
              bars={[
                { key: "d3_sipni", label: "SIPNI", color: "#10b981" },
                { key: "d3_vitacare", label: "Vitacare", color: "#8b5cf6" },
              ]}
              stacked
              height="100%"
            />
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Origem das D3 registradas</p>
            <div className="flex gap-4">
              {origens.map((o) => (
                <div key={o.label} className="flex items-center gap-2 flex-1 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />
                  <span className="text-xs text-gray-600">{o.label}</span>
                  <span className="ml-auto text-xs font-bold text-gray-800">{o.value.toLocaleString("pt-BR")}</span>
                  <span className="text-xs text-gray-400">{totalGeral > 0 ? `${((o.value / totalGeral) * 100).toFixed(1)}%` : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
