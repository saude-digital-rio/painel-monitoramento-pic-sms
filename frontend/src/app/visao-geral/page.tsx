import { Header } from "@/components/layout/Header";
import { Card, StatCard } from "@/components/ui/Card";
import { SeveridadeBadge, StatusDot } from "@/components/ui/Badge";
import { FreshnessBar } from "@/components/ui/FreshnessBar";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { MultiLineChart } from "@/components/charts/LineChart";
import { api } from "@/lib/api/client";
import { Users, Activity, Bell, Database, Zap } from "lucide-react";

export default async function VisaoGeralPage() {
  const [fontesReal, modelosReal, popReal, serieReal, alertasReal] = await Promise.all([
    api.fontes.status(),
    api.fontes.modelos(),
    api.populacao.atual(),
    api.populacao.serie(30),
    api.alertas.lista(),
  ]);

  const alertasAtivos = alertasReal?.filter((a) => !a.investigado) ?? [];
  const criticos = alertasAtivos.filter((a) => a.severidade === "critico").length;
  const alertasCount = alertasAtivos.filter((a) => a.severidade === "alerta").length;
  const avisos = alertasAtivos.filter((a) => a.severidade === "aviso").length;
  const fontesComProblema = fontesReal?.filter((f) => f.severidade !== "ok").length ?? 0;
  const modelosComProblema = modelosReal?.filter((m) => m.severidade !== "ok").length ?? 0;

  const dataRef = popReal?.data_referencia ?? undefined;

  return (
    <div>
      <Header
        title="Visão Geral"
        subtitle="Saúde do pipeline — O que a SMS está enviando para o PIC está correto?"
        dataRef={dataRef}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="População-alvo total"
          value={popReal?.total ?? 0}
          sub={dataRef ? `Ref. ${new Date(dataRef).toLocaleDateString("pt-BR")}` : "Sem dados"}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Alertas críticos"
          value={alertasReal ? criticos : "—"}
          sub={alertasReal ? `${alertasCount} alertas · ${avisos} avisos` : "API indisponível"}
          icon={<Bell className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          label="Fontes com problema"
          value={fontesReal ? fontesComProblema : "—"}
          sub={fontesReal ? `de ${fontesReal.length} fontes monitoradas` : "API indisponível"}
          icon={<Database className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          label="Modelos com alerta"
          value={modelosReal ? modelosComProblema : "—"}
          sub="de 2 modelos de saída"
          icon={<Zap className="w-5 h-5" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Evolução população */}
        <Card title="Evolução da população-alvo (30 dias)" className="lg:col-span-2">
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

        {/* Segmentos */}
        <Card title="Segmentos atuais">
          {popReal ? (
            <div className="space-y-4">
              {[
                { label: "Gestação", value: popReal.gestacao, color: "bg-purple-500" },
                { label: "Puerpério", value: popReal.puerperio, color: "bg-pink-500" },
                { label: "Infância", value: popReal.infancia, color: "bg-blue-500" },
              ].map((seg) => {
                const pct = popReal.total > 0
                  ? ((seg.value / popReal.total) * 100).toFixed(1)
                  : "0";
                return (
                  <div key={seg.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{seg.label}</span>
                      <span className="text-gray-900 font-semibold">{seg.value.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${seg.color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{pct}% do total</p>
                  </div>
                );
              })}
              {popReal.cpf_sobreposicao > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-800 font-medium">
                    ⚠ {popReal.cpf_sobreposicao} CPFs em mais de um segmento
                  </p>
                </div>
              )}
            </div>
          ) : (
            <ApiErrorCard />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status das fontes */}
        <Card title="Status das fontes" subtitle="Freshness e alertas de volume" padding={false}>
          {fontesReal ? (
            <div className="divide-y divide-gray-50">
              {fontesReal.map((fonte) => (
                <div key={fonte.tabela} className="px-5 py-3 flex items-start gap-3">
                  <StatusDot severidade={fonte.severidade} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{fonte.nome}</p>
                    {fonte.ultima_atualizacao && fonte.horas_sem_atualizacao !== null ? (
                      <FreshnessBar
                        horas={fonte.horas_sem_atualizacao}
                        severidade={fonte.severidade}
                        ultimaAtualizacao={fonte.ultima_atualizacao}
                      />
                    ) : (
                      <p className="text-xs text-gray-400">{fonte.erro ?? "Sem dados"}</p>
                    )}
                    {fonte.variacao_pct !== null && Math.abs(fonte.variacao_pct) > 10 && (
                      <p className={`text-xs mt-0.5 ${fonte.variacao_pct < 0 ? "text-red-600" : "text-green-600"}`}>
                        Variação: {fonte.variacao_pct > 0 ? "+" : ""}{fonte.variacao_pct.toFixed(1)}% vs média 7d
                      </p>
                    )}
                  </div>
                  <SeveridadeBadge severidade={fonte.severidade} />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4"><ApiErrorCard /></div>
          )}
        </Card>

        <div className="space-y-6">
          {/* Execução dos modelos */}
          <Card title="Execução dos modelos de saída">
            {modelosReal ? (
              <div className="space-y-4">
                {modelosReal.map((m) => (
                  <div key={m.modelo} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs font-mono text-gray-700 truncate flex-1">{m.modelo}</p>
                      <SeveridadeBadge severidade={m.severidade} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>
                        <span className="text-gray-400">Última execução:</span>
                        <p className="font-medium">
                          {m.ultima_execucao
                            ? new Date(m.ultima_execucao).toLocaleString("pt-BR")
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Intervalo:</span>
                        <p className={`font-medium ${m.intervalo_horas > 25 ? "text-red-600" : "text-gray-800"}`}>
                          {m.intervalo_horas?.toFixed(1)}h
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Volume atual:</span>
                        <p className="font-medium">{m.volume_atual.toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ApiErrorCard />
            )}
          </Card>

          {/* Alertas recentes */}
          <Card title="Alertas ativos recentes" padding={false}>
            {alertasReal ? (
              <>
                <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
                  {alertasAtivos.slice(0, 6).map((a) => (
                    <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                      <StatusDot severidade={a.severidade} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase">{a.categoria}</p>
                        <p className="text-sm text-gray-800 mt-0.5 leading-snug">{a.descricao}</p>
                      </div>
                    </div>
                  ))}
                  {alertasAtivos.length === 0 && (
                    <p className="px-5 py-4 text-sm text-gray-400">Nenhum alerta ativo.</p>
                  )}
                </div>
                <div className="px-5 py-3 border-t border-gray-100">
                  <a href="/alertas" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    Ver todos os alertas →
                  </a>
                </div>
              </>
            ) : (
              <div className="p-4"><ApiErrorCard /></div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
