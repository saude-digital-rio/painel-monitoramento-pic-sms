import { Card } from "@/components/ui/Card";
import { MultiLineChart } from "@/components/charts/LineChart";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";

export async function SerieChartAsync() {
  const serieReal = await api.populacao.serie(30);
  return (
    <Card
      title="Evolução da população-alvo (30 dias)"
      className="lg:col-span-2"
      tooltip="Novas entradas por dia em cada segmento nos últimos 30 dias, agrupadas pela data de início da janela de monitoramento. Não representa o total acumulado da população."
    >
      {serieReal ? (
        <MultiLineChart
          data={serieReal}
          lines={[
            { key: "gestacao", label: "Gestação", color: "#8b5cf6" },
            { key: "puerperio", label: "Puerpério", color: "#ec4899" },
            { key: "infancia", label: "Infância", color: "#3b82f6" },
          ]}
          height={220}
        />
      ) : (
        <ApiErrorCard />
      )}
    </Card>
  );
}
