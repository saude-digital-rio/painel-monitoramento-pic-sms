import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { MultiLineChart } from "@/components/charts/LineChart";
import { api } from "@/lib/api/client";

export async function TestesAsync() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [testesReal, divergenciaReal] = await Promise.all([
    api.vacinacao.testesRapidos(12),
    api.vacinacao.divergenciaTestes(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testes = testesReal as any[] | null;
  const divergencia = divergenciaReal;

  return (
    <Card title="Testes rápidos — divergência entre fontes (RF-08)" tooltip="Compara a contagem de testes rápidos entre a tabela de procedimentos e a API de testes, por tipo. Divergências acima de 10% são sinalizadas.">
      {divergencia ? (
        <div className="space-y-3 mb-4">
          {Object.entries(divergencia).map(([tipo, d]) => {
            const labels: Record<string, string> = { hiv: "HIV", sifilis: "Sífilis", hepb: "Hep. B", hepc: "Hep. C" };
            return (
              <div key={tipo} className="border border-gray-100 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-semibold text-gray-700">{labels[tipo]}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.pct > 10 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {d.pct}% de divergência
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-gray-400 mb-0.5">Procedimentos</p>
                    <p className="font-bold text-gray-800">{d.procedimento.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-gray-400 mb-0.5">Teste rápido API</p>
                    <p className="font-bold text-gray-800">{d.testerapido.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className={`rounded p-2 ${d.diferenca > 200 ? "bg-red-50" : "bg-yellow-50"}`}>
                    <p className="text-gray-400 mb-0.5">Diferença</p>
                    <p className={`font-bold ${d.diferenca > 200 ? "text-red-700" : "text-yellow-700"}`}>+{d.diferenca.toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <ApiErrorCard mensagem="Dados de divergência indisponíveis." />
      )}

      <Card title="Série semanal — testes rápidos (12 semanas)" tooltip="Volume semanal de testes rápidos nas últimas 12 semanas, comparando registros de procedimentos com resultados da API de testes, por tipo.">
        {testes ? (
          <MultiLineChart
            data={testes}
            lines={[
              { key: "hiv_procedimento", label: "HIV (proc.)", color: "#8b5cf6" },
              { key: "hiv_testerapido", label: "HIV (API)", color: "#a78bfa" },
              { key: "sifilis_procedimento", label: "Sífilis (proc.)", color: "#f59e0b" },
              { key: "sifilis_testerapido", label: "Sífilis (API)", color: "#fcd34d" },
            ]}
            height={200}
          />
        ) : (
          <ApiErrorCard />
        )}
      </Card>
    </Card>
  );
}
