import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { DonutChart } from "@/components/charts/DonutChart";
import { api } from "@/lib/api/client";
import { CoberturaCondicaoCard } from "./CoberturaCondicaoCard";

const DIST_COLOR = ["#ef4444", "#fb923c", "#facc15", "#84cc16", "#22c55e"];

export async function CoberturaGestantesAsync() {
  const data = await api.eventos.coberturaGestantes();

  if (!data) return <ApiErrorCard />;

  const { total_gestantes, distribuicao_condicoes, evidencia_por_condicao, diagnosticos } = data;

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <CoberturaCondicaoCard
          total_gestantes={total_gestantes}
          evidencia_por_condicao={evidencia_por_condicao}
        />

        {/* Distribuição por número de condições cobertas */}
        <Card
          title="Cobertura das 4 condições por gestante"
          tooltip="Quantas gestantes têm evidência (teste ou diagnóstico) para 0, 1, 2, 3 ou todas as 4 condições monitoradas (HIV, sífilis, hepatite B e hepatite C)."
        >
          <p className="text-xs text-gray-400 mb-4">
            Ideal: gestantes com <span className="font-semibold">4 de 4</span> condições cobertas
          </p>
          <DonutChart
            slices={distribuicao_condicoes.map((d, i) => ({
              label: `${d.condicoes} de 4 condições`,
              value: d.gestantes,
              color: DIST_COLOR[i],
            }))}
            centerLabel={`${total_gestantes.toLocaleString("pt-BR")}`}
            centerSub="gestantes"
          />
        </Card>

      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Evidências faltantes */}
        <Card
          title="Evidências faltantes por condição"
          tooltip="Gestantes sem nenhuma evidência identificada para cada condição: sem teste rápido e sem diagnóstico registrado."
        >
          <div className="space-y-3">
            {evidencia_por_condicao.map((c) => {
              const faltantePct = total_gestantes > 0 ? Math.round(c.sem_evidencia / total_gestantes * 1000) / 10 : 0;
              const isAlto = faltantePct > 50;
              return (
                <div key={c.condicao} className={`flex items-center justify-between p-3 rounded-lg border ${isAlto ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"}`}>
                  <span className="text-sm text-gray-700">{c.condicao}</span>
                  <span className="text-sm text-right">
                    <span className={`font-bold ${isAlto ? "text-red-600" : "text-gray-700"}`}>
                      {c.sem_evidencia.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-gray-400 ml-1 text-xs">({faltantePct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Diagnósticos identificados */}
        <Card
          title="Diagnósticos identificados"
          tooltip="Gestantes com diagnóstico de IST registrado no histórico clínico, independentemente de teste rápido. Inclui diagnósticos feitos antes ou fora do período gestacional."
        >
          <div className="space-y-3">
            {diagnosticos.map((d) => (
              <div key={d.condicao} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-sm text-gray-700">{d.condicao}</span>
                <span className="text-sm text-right">
                  <span className="font-bold text-gray-800">{d.com_diagnostico.toLocaleString("pt-BR")}</span>
                  <span className="text-gray-400 ml-1 text-xs">({d.pct}%)</span>
                </span>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
