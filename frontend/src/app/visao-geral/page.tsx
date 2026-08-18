import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Card, StatCard } from "@/components/ui/Card";
import { SeveridadeBadge } from "@/components/ui/Badge";
import { FreshnessBar } from "@/components/ui/FreshnessBar";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";
import { Users, Bell, Database, Zap } from "lucide-react";
import { SobreposicaoModal } from "@/components/ui/SobreposicaoModal";
import { SerieChartAsync } from "./SerieChartAsync";
import { AlertasAsync } from "./AlertasAsync";

export default async function VisaoGeralPage() {
  const [fontesReal, modelosReal, popReal] = await Promise.all([
    api.fontes.status(),
    api.fontes.modelos(),
    api.populacao.atual(),
  ]);

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
          value="—"
          sub="Ver alertas abaixo"
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
        <Suspense fallback={
          <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5">
            <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mb-4" />
            <div className="h-[220px] bg-gray-50 rounded-xl animate-pulse" />
          </div>
        }>
          <SerieChartAsync />
        </Suspense>

        {/* Segmentos */}
        <Card title="Segmentos atuais" tooltip="Distribuição atual da população-alvo entre os três segmentos monitorados: gestação, puerpério e infância.">
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
                <SobreposicaoModal count={popReal.cpf_sobreposicao} />
              )}
            </div>
          ) : (
            <ApiErrorCard />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status das fontes */}
        <Card title="Status das fontes" subtitle="Freshness e alertas de volume" padding={false} tooltip="Tempo desde a última atualização das tabelas de dados (Vitacare, SIPNI). Alertas indicam dados potencialmente desatualizados.">
          {fontesReal ? (
            <div className="divide-y divide-gray-50">
              {fontesReal.map((fonte) => (
                <div key={fonte.tabela} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{fonte.nome}</p>
                      {fonte.cadencia === "mensal" && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-medium">mensal</span>
                      )}
                    </div>
                    <SeveridadeBadge severidade={fonte.severidade} />
                  </div>
                  <div className="flex flex-col gap-y-0.5 mb-1.5">
                    <span className="text-[11px] text-gray-400 font-mono truncate">
                      <span className="text-gray-300 select-none">Modelo </span>{fonte.tabela}
                    </span>
                    {fonte.dataset && fonte.table_id && (
                      <span className="text-[11px] font-mono truncate">
                        <span className="text-gray-300 select-none">Tabela </span>
                        <span className="text-gray-400">{fonte.dataset}.</span>
                        <span className="text-gray-600 font-medium">{fonte.table_id}</span>
                      </span>
                    )}
                  </div>
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
              ))}
            </div>
          ) : (
            <div className="p-4"><ApiErrorCard /></div>
          )}
        </Card>

        <div className="space-y-6">
          {/* Execução dos modelos */}
          <Card title="Execução dos modelos de saída" tooltip="Última execução dos modelos dbt que geram as tabelas enviadas ao PIC. Intervalos acima de 25h indicam atraso na entrega dos dados.">
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
          <Suspense fallback={
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <div className="h-4 w-44 bg-gray-100 rounded animate-pulse mb-4" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 py-3 border-b border-gray-50">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-20 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          }>
            <AlertasAsync />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
