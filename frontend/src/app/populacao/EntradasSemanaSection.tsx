"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { MultiBarChart } from "@/components/charts/BarChart";
import { type EntradaSaidaAPI } from "@/lib/api/client";

const CORES = { Gestacao: "#8b5cf6", Puerperio: "#ec4899", Infancia: "#3b82f6" };

const OPCOES = [
  { label: "4 sem", value: 4 },
  { label: "8 sem", value: 8 },
  { label: "12 sem", value: 12 },
  { label: "24 sem", value: 24 },
];

const API_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    : "http://localhost:8000";

async function fetchEntradas(semanas: number): Promise<EntradaSaidaAPI[] | null> {
  try {
    const res = await fetch(`${API_URL}/api/populacao/entradas-saidas?semanas=${semanas}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function pivot(data: EntradaSaidaAPI[]) {
  return data
    .filter((e) => e.segmento === "Gestacao")
    .map((e) => {
      const pp = data.find((x) => x.data === e.data && x.segmento === "Puerperio");
      const ip = data.find((x) => x.data === e.data && x.segmento === "Infancia");
      return {
        data: e.data,
        entradas_gestacao: e.entradas,
        entradas_puerperio: pp?.entradas ?? 0,
        entradas_infancia: ip?.entradas ?? 0,
      };
    });
}

export function EntradasSemanaSection({ initialData }: { initialData: EntradaSaidaAPI[] | null }) {
  const [semanas, setSemanas] = useState(12);
  const [data, setData] = useState<EntradaSaidaAPI[] | null>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (semanas === 12 && initialData !== null) return;
    setLoading(true);
    fetchEntradas(semanas).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [semanas]);

  const chartData = data ? pivot(data) : [];

  return (
    <Card
      title="Entradas por semana"
      tooltip="Novos registros adicionados à população-alvo a cada semana, agrupados por segmento."
    >
      <div className="flex items-center gap-1 mb-4">
        {OPCOES.map((op) => (
          <button
            key={op.value}
            onClick={() => setSemanas(op.value)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              semanas === op.value
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-[220px] bg-gray-50 rounded-xl animate-pulse" />
      ) : data ? (
        <MultiBarChart
          data={chartData}
          bars={[
            { key: "entradas_gestacao", label: "Gestação", color: CORES.Gestacao },
            { key: "entradas_puerperio", label: "Puerpério", color: CORES.Puerperio },
            { key: "entradas_infancia", label: "Infância", color: CORES.Infancia },
          ]}
          height={220}
        />
      ) : (
        <ApiErrorCard />
      )}
    </Card>
  );
}
