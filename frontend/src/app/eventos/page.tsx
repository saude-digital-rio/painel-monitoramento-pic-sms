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
        subtitle="Cobertura, volume, consistência temporal e tipos de evento por segmento"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Consultas (30d)" value={totais?.consulta ?? "—"} icon={<Activity className="w-5 h-5" />} color="blue" />
        <StatCard label="Visitas dom. (30d)" value={totais?.visita ?? "—"} icon={<Activity className="w-5 h-5" />} color="green" />
        <StatCard label="Testes rápidos (30d)" value={totais?.testes ?? "—"} icon={<Activity className="w-5 h-5" />} color="purple" />
        <StatCard label="Vacinas Pentavalente - Dose 3 (30d)" value={totais?.vacina ?? "—"} icon={<Activity className="w-5 h-5" />} color="orange" />
        <StatCard label="Diagnósticos de IST (30d)" value={totais?.diagnostico ?? "—"} icon={<Activity className="w-5 h-5" />} color="red" />
      </div>

      <details className="group mb-6">
        <summary className="cursor-pointer list-none flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors select-none w-fit">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Ver critérios de classificação dos eventos
        </summary>
        <div className="mt-3 rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Tipo de evento</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Fonte</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Critério</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {([
                ["Consulta", "Vitacare · atendimento", "Realizado por médico ou enfermeiro (CBO), excluindo visitas domiciliares"],
                ["Visita Domiciliar", "Vitacare · atendimento", "tipo_consulta contém 'visita'; profissional ACS ou Técnico de ACS (CBO 515105 / 322255)"],
                ["Teste rápido — HIV", "Vitacare · histórico (procedimentos / testerapido) e API testerapido", "Código SIGTAP 0214010058 / 0214010040 ou campo resultado_teste_hiv preenchido"],
                ["Teste rápido — Sífilis", "Vitacare · histórico (procedimentos / testerapido) e API testerapido", "Código SIGTAP 0214010074 / 0214010082 ou campo resultado_teste_sifilis preenchido"],
                ["Teste rápido — Hepatite B", "Vitacare · histórico (procedimentos / testerapido) e API testerapido", "Código SIGTAP 0214010104 ou campo resultado_teste_hepatite_b preenchido"],
                ["Teste rápido — Hepatite C", "Vitacare · histórico (procedimentos / testerapido) e API testerapido", "Código SIGTAP 0214010090 ou campo resultado_teste_hepatite_c preenchido"],
                ["Vacina — Pentavalente D3", "CIT / SIPNI · vacinação", "3ª dose de vacina penta ou hexavalente; exclui registros 'Não aplicada'"],
                ["Diagnóstico — HIV", "Histórico clínico · episódio", "CID: B20–B24, Z21, O987"],
                ["Diagnóstico — Sífilis", "Histórico clínico · episódio", "CID: A50–A53, O981"],
                ["Diagnóstico — Hepatite B", "Histórico clínico · episódio", "CID: B16, B180, B181"],
                ["Diagnóstico — Hepatite C", "Histórico clínico · episódio", "CID: B171, B182"],
              ] as [string, string, string][]).map(([tipo, fonte, criterio]) => (
                <tr key={tipo} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{tipo}</td>
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fonte}</td>
                  <td className="px-4 py-2.5 text-gray-600">{criterio}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-2 border-t border-gray-100">
            Modelo dbt: <span className="font-mono">mart_iplanrio_pic__eventos</span>
          </p>
        </div>
      </details>

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
    </div>
  );
}
