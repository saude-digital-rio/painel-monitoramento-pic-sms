import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Card, StatCard } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { MultiBarChart } from "@/components/charts/BarChart";
import { api } from "@/lib/api/client";
import { PentaAsync } from "./PentaAsync";
import { TestesAsync } from "./TestesAsync";

export default async function ConsistenciaPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serieReal = await api.vacinacao.serie(12) as any[] | null;
  const ultimaVac = serieReal?.at(-1) ?? null;

  return (
    <div>
      <Header
        title="Consistência entre Fontes"
        subtitle="Vacinação Vitacare × SIPNI e testes rápidos pelas diferentes rotas"
      />

      {/* Vacinação KPIs */}
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Vacinação — Pentavalente D3</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="D3 registrados (semana)" value={ultimaVac?.total_d3 ?? "—"} color="blue" />
        <StatCard label="Via SIPNI" value={ultimaVac?.d3_sipni ?? "—"} sub="fonte prioritária" color="green" />
        <StatCard label="Via Vitacare" value={ultimaVac?.d3_vitacare ?? "—"} sub="complementar" color="purple" />
        <StatCard label="Taxa de descarte" value={ultimaVac ? `${ultimaVac.taxa_descarte_pct}%` : "—"} sub="última semana" color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Série vacinação */}
        <Card title="Volume semanal D3 pentavalente (12 semanas)" tooltip="Doses D3 da vacina pentavalente registradas por semana nas últimas 12 semanas, separadas por fonte (SIPNI e Vitacare).">
          {serieReal ? (
            <MultiBarChart
              data={serieReal}
              bars={[
                { key: "d3_sipni", label: "SIPNI", color: "#10b981" },
                { key: "d3_vitacare", label: "Vitacare", color: "#8b5cf6" },
              ]}
              stacked
              height={220}
            />
          ) : (
            <ApiErrorCard />
          )}
        </Card>

        {/* Taxa de descarte */}
        <Card title="Série de descarte semanal" subtitle="Registros excluídos por motivo" tooltip="Registros de vacinação removidos a cada semana, classificados pelo motivo: vacina não aplicada, data nula ou outros.">
          {serieReal ? (
            <MultiBarChart
              data={serieReal}
              bars={[
                { key: "descartados_nao_aplicada", label: "Não aplicada", color: "#f59e0b" },
                { key: "descartados_data_nula", label: "Data nula", color: "#ef4444" },
                { key: "descartados_outros", label: "Outros motivos", color: "#6b7280" },
              ]}
              stacked
              height={220}
            />
          ) : (
            <ApiErrorCard />
          )}
        </Card>
      </div>

      {/* Sequência pentavalente + testes rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Suspense fallback={
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-28 bg-blue-50 rounded-xl animate-pulse" />
              {[0, 1, 2].map((i) => <div key={i} className="h-14 bg-gray-50 rounded-lg border border-gray-100 animate-pulse" />)}
            </div>
          </div>
        }>
          <PentaAsync />
        </Suspense>

        <Suspense fallback={
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-50 rounded-lg border border-gray-100 animate-pulse" />)}
            </div>
          </div>
        }>
          <TestesAsync />
        </Suspense>
      </div>
    </div>
  );
}
