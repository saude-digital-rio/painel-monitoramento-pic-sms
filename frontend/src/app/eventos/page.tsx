import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Card, StatCard } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { MultiLineChart } from "@/components/charts/LineChart";
import { api } from "@/lib/api/client";
import { Activity } from "lucide-react";
import { CoberturaAsync } from "./CoberturaAsync";
import { DetalheAsync } from "./DetalheAsync";

const TIPO_COLORS: Record<string, string> = {
  consulta: "#3b82f6",
  visita: "#10b981",
  teste_hiv: "#8b5cf6",
  teste_sifilis: "#f59e0b",
  teste_hepb: "#ef4444",
  teste_hepc: "#ec4899",
  vacina_d3: "#06b6d4",
  diagnostico: "#6366f1",
};

export default async function EventosPage() {
  const serieReal = await api.eventos.serie(30);

  const totais = serieReal
    ? serieReal.reduce(
        (acc, d) => ({
          consulta: acc.consulta + (d.consulta ?? 0),
          visita: acc.visita + (d.visita ?? 0),
          testes: acc.testes + (d.teste_hiv ?? 0) + (d.teste_sifilis ?? 0) + (d.teste_hepb ?? 0) + (d.teste_hepc ?? 0),
          vacina: acc.vacina + (d.vacina_d3 ?? 0),
          diagnostico: acc.diagnostico + (d.diagnostico ?? 0),
        }),
        { consulta: 0, visita: 0, testes: 0, vacina: 0, diagnostico: 0 }
      )
    : null;

  return (
    <div>
      <Header
        title="Eventos"
        subtitle="Cobertura, volume, consistência temporal e tipos de evento por segmento (RF-05, RF-06, RF-16, RF-18)"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Consultas (30d)" value={totais?.consulta ?? "—"} icon={<Activity className="w-5 h-5" />} color="blue" />
        <StatCard label="Visitas dom. (30d)" value={totais?.visita ?? "—"} icon={<Activity className="w-5 h-5" />} color="green" />
        <StatCard label="Testes rápidos (30d)" value={totais?.testes ?? "—"} icon={<Activity className="w-5 h-5" />} color="purple" />
        <StatCard label="Vacinas Pentavalente - Dose 3 (30d)" value={totais?.vacina ?? "—"} icon={<Activity className="w-5 h-5" />} color="orange" />
        <StatCard label="Diagnósticos de IST (30d)" value={totais?.diagnostico ?? "—"} icon={<Activity className="w-5 h-5" />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Volume de consultas e visitas domiciliares (últimos 30 dias)" tooltip="Quantidade diária de consultas e visitas domiciliares registradas nos últimos 30 dias.">
          {serieReal ? (
            <MultiLineChart
              data={serieReal}
              lines={[
                { key: "consulta", label: "Consulta", color: TIPO_COLORS.consulta },
                { key: "visita", label: "Visita Domiciliar", color: TIPO_COLORS.visita },
              ]}
              height={220}
            />
          ) : (
            <ApiErrorCard />
          )}
        </Card>

        <Card title="Testes rápidos por tipo (30 dias)" tooltip="Volume diário de testes rápidos realizados nos últimos 30 dias, separados por tipo (HIV, sífilis, hepatite B e C).">
          {serieReal ? (
            <MultiLineChart
              data={serieReal}
              lines={[
                { key: "teste_hiv", label: "HIV", color: TIPO_COLORS.teste_hiv },
                { key: "teste_sifilis", label: "Sífilis", color: TIPO_COLORS.teste_sifilis },
                { key: "teste_hepb", label: "Hep. B", color: TIPO_COLORS.teste_hepb },
                { key: "teste_hepc", label: "Hep. C", color: TIPO_COLORS.teste_hepc },
              ]}
              height={220}
            />
          ) : (
            <ApiErrorCard />
          )}
        </Card>
      </div>

      {/* Cobertura */}
      <Suspense fallback={
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5">
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-32 bg-gray-50 rounded-xl border border-gray-100 animate-pulse" />)}
          </div>
        </div>
      }>
        <CoberturaAsync />
      </Suspense>

      {/* Consistência, completude e compatibilidade */}
      <Suspense fallback={
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, j) => <div key={j} className="h-10 bg-gray-50 rounded-lg border border-gray-100 animate-pulse" />)}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 h-48 animate-pulse" />
        </div>
      }>
        <DetalheAsync />
      </Suspense>

      {/* Regras de compatibilidade */}
      <Card title="Regras de compatibilidade evento × segmento" className="mt-6" tooltip="Matriz estática definida no backend (RF-16). Combinações marcadas com ✗ são sinalizadas como 'Improvável' na tabela acima.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Tipo de evento</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-purple-500 uppercase">Gestação</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-pink-500 uppercase">Puerpério</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-blue-500 uppercase">Infância</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Motivo da restrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                {
                  evento: "Consulta",
                  gestacao: true, puerperio: true, infancia: true,
                  motivo: null,
                },
                {
                  evento: "Visita Domiciliar",
                  gestacao: true, puerperio: true, infancia: true,
                  motivo: null,
                },
                {
                  evento: "Teste rápido - HIV",
                  gestacao: true, puerperio: true, infancia: false,
                  motivo: "Crianças < 6 anos não são público-alvo de testes de HIV",
                },
                {
                  evento: "Teste rápido - Sífilis",
                  gestacao: true, puerperio: true, infancia: false,
                  motivo: "Crianças < 6 anos não são público-alvo de testes de sífilis",
                },
                {
                  evento: "Teste rápido - Hepatite B",
                  gestacao: true, puerperio: true, infancia: false,
                  motivo: "Crianças < 6 anos não são público-alvo de testes de hepatite B",
                },
                {
                  evento: "Teste rápido - Hepatite C",
                  gestacao: true, puerperio: true, infancia: false,
                  motivo: "Crianças < 6 anos não são público-alvo de testes de hepatite C",
                },
                {
                  evento: "Vacina - Pentavalente - D3",
                  gestacao: false, puerperio: false, infancia: true,
                  motivo: "Vacina infantil — não aplicável a gestantes ou puérperas",
                },
                {
                  evento: "Diagnóstico",
                  gestacao: true, puerperio: true, infancia: true,
                  motivo: null,
                },
              ].map((row) => (
                <tr key={row.evento} className={(!row.gestacao || !row.puerperio || !row.infancia) ? "bg-red-50/40" : undefined}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{row.evento}</td>
                  {[row.gestacao, row.puerperio, row.infancia].map((ok, i) => (
                    <td key={i} className="px-4 py-2.5 text-center">
                      {ok
                        ? <span className="text-green-600 font-bold text-base">✓</span>
                        : <span className="text-red-500 font-bold text-base">✗</span>
                      }
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-xs text-gray-500">{row.motivo ?? <span className="text-gray-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">Regras definidas em <span className="font-mono">backend/app/routers/eventos.py</span> · constante <span className="font-mono">INCOMPATIVEIS</span></p>
      </Card>
    </div>
  );
}
