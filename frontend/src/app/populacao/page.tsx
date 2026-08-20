import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Card, StatCard } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { MultiBarChart } from "@/components/charts/BarChart";
import {
  api,
  type EntradaSaidaAPI,
} from "@/lib/api/client";
import { Users, AlertTriangle } from "lucide-react";
import { SerieAsync } from "./SerieAsync";
import { GestacaoCadastroAsync } from "./GestacaoCadastroAsync";

const CORES = { Gestacao: "#8b5cf6", Puerperio: "#ec4899", Infancia: "#3b82f6" };

export default async function PopulacaoPage() {
  const [popReal, janelasReal, entradasReal] =
    await Promise.all([
      api.populacao.atual(),
      api.populacao.janelas(),
      api.populacao.entradasSaidas(12),
    ]);

  const entradaSaida: EntradaSaidaAPI[] = entradasReal ?? [];

  const entradasPorSemana = entradaSaida
    .filter((e) => e.segmento === "Gestacao")
    .map((e) => {
      const gp = entradaSaida.find((x) => x.data === e.data && x.segmento === "Gestacao");
      const pp = entradaSaida.find((x) => x.data === e.data && x.segmento === "Puerperio");
      const ip = entradaSaida.find((x) => x.data === e.data && x.segmento === "Infancia");
      return {
        data: e.data,
        entradas_gestacao: gp?.entradas ?? 0,
        entradas_puerperio: pp?.entradas ?? 0,
        entradas_infancia: ip?.entradas ?? 0,
      };
    });

  return (
    <div>
      <Header
        title="População-alvo"
        subtitle="Volume por segmento, qualidade cadastral, janelas e anomalias (RF-02, RF-03, RF-04, RF-10, RF-11)"
        dataRef={popReal?.data_referencia ?? undefined}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={popReal?.total ?? "—"} icon={<Users className="w-5 h-5" />} color="blue" />
        <StatCard label="Gestação" value={popReal?.gestacao ?? "—"} sub="janela ≤ 300 dias" icon={<Users className="w-5 h-5" />} color="purple" />
        <StatCard label="Puerpério" value={popReal?.puerperio ?? "—"} sub="janela = 45 dias" icon={<Users className="w-5 h-5" />} color="orange" />
        <StatCard label="Infância" value={popReal?.infancia ?? "—"} sub="nascidos ≤ 6 anos" icon={<Users className="w-5 h-5" />} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Série temporal */}
        <Suspense fallback={
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mb-4" />
            <div className="h-[240px] bg-gray-50 rounded-xl animate-pulse" />
          </div>
        }>
          <SerieAsync />
        </Suspense>

        {/* Janelas temporais */}
        <Card title="Consistência das janelas temporais (RF-04)" tooltip="Verifica se as datas das janelas estão dentro dos limites: gestação ≤ 300 dias, puerpério = 45 dias exatos, infância ≤ 6 anos.">
          {janelasReal ? (
            <div className="space-y-4">
              {[
                {
                  seg: "Gestação",
                  items: [
                    { label: "Total", value: janelasReal.gestacao.total, ok: true },
                    { label: "Duração zero/negativa", value: janelasReal.gestacao.duracao_zero_negativa, ok: janelasReal.gestacao.duracao_zero_negativa === 0 },
                    { label: "Acima de 300 dias", value: janelasReal.gestacao.acima_300_dias, ok: janelasReal.gestacao.acima_300_dias === 0 },
                    { label: "Média de duração", value: `${janelasReal.gestacao.media_duracao_dias} dias`, ok: true },
                  ],
                },
                {
                  seg: "Puerpério",
                  items: [
                    { label: "Total", value: janelasReal.puerperio.total, ok: true },
                    { label: "Diferente de 45 dias", value: janelasReal.puerperio.diferente_45_dias, ok: janelasReal.puerperio.diferente_45_dias === 0 },
                    { label: "Média de duração", value: `${janelasReal.puerperio.media_duracao_dias} dias`, ok: true },
                  ],
                },
                {
                  seg: "Infância",
                  items: [
                    { label: "Total", value: janelasReal.infancia.total, ok: true },
                    { label: "Diferente de ~6 anos", value: janelasReal.infancia.diferente_6_anos, ok: janelasReal.infancia.diferente_6_anos === 0 },
                    { label: "Média de duração", value: `${janelasReal.infancia.media_duracao_dias} dias`, ok: true },
                  ],
                },
              ].map((seg) => (
                <div key={seg.seg} className="border border-gray-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{seg.seg}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {seg.items.map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{item.label}</span>
                        <span className={`font-semibold flex items-center gap-1 ${!item.ok ? "text-red-600" : "text-gray-800"}`}>
                          {!item.ok && typeof item.value === "number" && item.value > 0 && <AlertTriangle className="w-3 h-3" />}
                          {typeof item.value === "number" ? item.value.toLocaleString("pt-BR") : item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ApiErrorCard />
          )}
        </Card>
      </div>

      {/* Entradas por semana */}
      <div className="mb-6">
        <Card title="Entradas por semana (RF-03)" tooltip="Novos registros adicionados à população-alvo a cada semana, agrupados por segmento (gestação, puerpério, infância).">
          {entradasReal ? (
            <MultiBarChart
              data={entradasPorSemana}
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
      </div>

      {/* Gestações e cadastro */}
      <Suspense fallback={
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5">
              <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-16 bg-gray-50 rounded-lg border border-gray-100 animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      }>
        <GestacaoCadastroAsync />
      </Suspense>
    </div>
  );
}
