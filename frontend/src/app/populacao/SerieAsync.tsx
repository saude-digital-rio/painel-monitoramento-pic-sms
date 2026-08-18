import { Card } from "@/components/ui/Card";
import { MultiLineChart } from "@/components/charts/LineChart";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";

const CORES = { Gestacao: "#8b5cf6", Puerperio: "#ec4899", Infancia: "#3b82f6" };

export async function SerieAsync() {
  const serieReal = await api.populacao.serie(30);
  return (
    <Card title="Novas entradas por dia — últimos 30 dias" tooltip="Quantas pessoas iniciaram sua janela de monitoramento em cada dia, por segmento. Não representa o total acumulado — a maioria da população entrou há mais de 30 dias.">
      {serieReal ? (
        <MultiLineChart
          data={serieReal}
          lines={[
            { key: "gestacao", label: "Gestação", color: CORES.Gestacao },
            { key: "puerperio", label: "Puerpério", color: CORES.Puerperio },
            { key: "infancia", label: "Infância", color: CORES.Infancia },
          ]}
          height={240}
        />
      ) : (
        <ApiErrorCard />
      )}
    </Card>
  );
}
