import { Header } from "@/components/layout/Header";
import { Card, StatCard } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { MultiBarChart } from "@/components/charts/BarChart";
import { MultiLineChart } from "@/components/charts/LineChart";
import { api, type CoberturaDoisAPI, type DivergenciaTestesAPI } from "@/lib/api/client";
import { AlertTriangle } from "lucide-react";

export default async function ConsistenciaPage() {
  const [serieReal, pentaReal, testesReal, coberturaReal, divergenciaReal] = await Promise.all([
    api.vacinacao.serie(12),
    api.vacinacao.pentavalente(),
    api.vacinacao.testesRapidos(12),
    api.vacinacao.coberturaDois(),
    api.vacinacao.divergenciaTestes(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serie = serieReal as any[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testes = testesReal as any[] | null;
  const coberturaDois: CoberturaDoisAPI | null = coberturaReal;
  const divergencia: DivergenciaTestesAPI | null = divergenciaReal;

  const ultimaVac = serie?.at(-1) ?? null;

  return (
    <div>
      <Header
        title="Consistência entre Fontes"
        subtitle="Vacinação Vitacare × SIPNI e testes rápidos pelas diferentes rotas (RF-07, RF-08, RF-17)"
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
        <Card title="Volume semanal D3 pentavalente (12 semanas)">
          {serie ? (
            <MultiBarChart
              data={serie}
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
        <Card title="Série de descarte semanal (RF-07)" subtitle="Registros excluídos por motivo">
          {serie ? (
            <MultiBarChart
              data={serie}
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

      {/* Sequência pentavalente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Sequência da pentavalente D1→D2→D3 (RF-17)">
          {pentaReal ? (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Crianças com D3 registrada</p>
                <p className="text-3xl font-bold text-blue-800 mt-1">{pentaReal.criancas_com_d3.toLocaleString("pt-BR")}</p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Com D3, D2 e D1</span>
                    <span className="font-semibold text-blue-900">{pentaReal.com_d3_e_d2_e_d1.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="h-2 bg-blue-200 rounded-full">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(pentaReal.com_d3_e_d2_e_d1 / (pentaReal.criancas_com_d3 || 1) * 100).toFixed(0)}%` }} />
                  </div>
                </div>
              </div>

              {[
                {
                  label: "Com D3 mas sem D2",
                  value: pentaReal.com_d3_sem_d2,
                  pct: (pentaReal.com_d3_sem_d2 / (pentaReal.criancas_com_d3 || 1) * 100).toFixed(1),
                },
                {
                  label: "Com D3 mas sem D1",
                  value: pentaReal.com_d3_sem_d1,
                  pct: (pentaReal.com_d3_sem_d1 / (pentaReal.criancas_com_d3 || 1) * 100).toFixed(1),
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm text-red-700">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-800">{item.value.toLocaleString("pt-BR")}</p>
                    <p className="text-xs text-red-600">{item.pct}%</p>
                  </div>
                </div>
              ))}

              <div className="border border-gray-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">Intervalo D2→D3</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center p-2 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-xs text-green-600">OK (28–90 dias)</p>
                    <p className="font-bold text-green-800">{pentaReal.intervalo_d2_d3_ok.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-600">{"< 28 dias"}</p>
                    <p className="font-bold text-red-800">{pentaReal.intervalo_d2_d3_menor_28d}</p>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-700">{"> 90 dias"}</p>
                    <p className="font-bold text-yellow-800">{pentaReal.intervalo_d2_d3_maior_90d}</p>
                  </div>
                </div>
              </div>

              {pentaReal.nomes_nao_mapeados.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Nomes não mapeados pelo filtro</p>
                  <div className="flex flex-wrap gap-1">
                    {pentaReal.nomes_nao_mapeados.map((n) => (
                      <span key={n} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full border border-orange-200">{n}</span>
                    ))}
                  </div>
                </div>
              )}

              {coberturaDois && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Cobertura de D3 entre crianças da população-alvo</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Crianças alvo: {coberturaDois.criancas_alvo.toLocaleString("pt-BR")}</span>
                    <span className="font-bold text-gray-800">{coberturaDois.cobertura_pct}% com D3</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <ApiErrorCard />
          )}
        </Card>

        {/* Testes rápidos */}
        <Card title="Testes rápidos — divergência entre fontes (RF-08)">
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

          <Card title="Série semanal — testes rápidos (12 semanas)">
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
      </div>
    </div>
  );
}
