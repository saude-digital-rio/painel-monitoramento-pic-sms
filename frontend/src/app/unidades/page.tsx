"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { SeveridadeBadge } from "@/components/ui/Badge";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { api, type UnidadeAPI } from "@/lib/api/client";
import { Search, BarChart2 } from "lucide-react";

export default function UnidadesPage() {
  const [filtroAp, setFiltroAp] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string | null>(null);
  const [unidades, setUnidades] = useState<UnidadeAPI[] | null>(null);

  useEffect(() => {
    api.unidades.lista().then((real) => setUnidades(real ?? []));
  }, []);

  if (unidades === null) return <PageSkeleton />;

  const aps = Array.from(new Set(unidades.map((u) => u.ap).filter((ap): ap is string => ap !== null))).sort();

  const unidadesFiltradas = unidades.filter((u) => {
    if (filtroAp !== "todas" && u.ap !== filtroAp) return false;
    if (filtroStatus !== "todas" && u.severidade !== filtroStatus) return false;
    if (busca && !u.nome.toLowerCase().includes(busca.toLowerCase()) && !u.cnes.includes(busca)) return false;
    return true;
  });

  const unidadeAtual = unidades.find((u) => u.cnes === unidadeSelecionada);

  const resumo = {
    critico: unidades.filter((u) => u.severidade === "critico").length,
    alerta: unidades.filter((u) => u.severidade === "alerta").length,
    aviso: unidades.filter((u) => u.severidade === "aviso").length,
    ok: unidades.filter((u) => u.severidade === "ok").length,
  };

  return (
    <div>
      <Header
        title="Unidades de Saúde"
        subtitle="Análise por CNES — queda de eventos e ausência de registros (RF-15)"
      />

      {/* Resumo */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Com problema crítico", value: resumo.critico, color: "bg-red-100 border-red-200 text-red-800" },
          { label: "Em alerta", value: resumo.alerta, color: "bg-orange-100 border-orange-200 text-orange-800" },
          { label: "Com aviso", value: resumo.aviso, color: "bg-yellow-100 border-yellow-200 text-yellow-800" },
          { label: "Normais", value: resumo.ok, color: "bg-green-100 border-green-200 text-green-800" },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl border px-4 py-3 ${item.color}`}>
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-sm mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar unidade ou CNES..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
        </div>
        <select
          value={filtroAp}
          onChange={(e) => setFiltroAp(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todas">Todas as APs</option>
          {aps.map((ap) => <option key={ap} value={ap}>{ap}</option>)}
        </select>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todas">Todos os status</option>
          <option value="critico">Crítico</option>
          <option value="alerta">Alerta</option>
          <option value="aviso">Aviso</option>
          <option value="ok">OK</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padding={false} className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidade</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">AP</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pop.</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ev. 7d</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Var.</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {unidadesFiltradas.map((u) => {
                  let varColor = "text-green-600";
                  if (u.variacao_pct <= -30) varColor = "text-red-600";
                  else if (u.variacao_pct <= -10) varColor = "text-orange-600";
                  return (
                    <tr
                      key={u.cnes}
                      className={`cursor-pointer transition-colors ${
                        unidadeSelecionada === u.cnes ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => setUnidadeSelecionada(unidadeSelecionada === u.cnes ? null : u.cnes)}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">{u.nome}</p>
                        <p className="text-xs text-gray-400 font-mono">CNES {u.cnes}</p>
                        {u.horas_sem_evento >= 168 && (
                          <p className="text-xs text-red-600 font-medium">
                            ⚠ {Math.floor(u.horas_sem_evento / 24)} dias sem eventos
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{u.ap}</span>
                      </td>
                      <td className="px-3 py-3 text-right text-gray-600 font-mono text-xs">
                        {(u.populacao ?? 0).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-medium text-gray-700">
                        {u.eventos_7d.toLocaleString("pt-BR")}
                      </td>
                      <td className={`px-3 py-3 text-right font-medium ${varColor}`}>
                        {u.variacao_pct > 0 ? "+" : ""}{u.variacao_pct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-3 text-center">
                        <SeveridadeBadge severidade={u.severidade} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Detalhes da unidade ou regras */}
        <div>
          {unidadeSelecionada && unidadeAtual ? (
            <Card title={unidadeAtual.nome} subtitle={`CNES ${unidadeSelecionada}`}>
              {/* Histórico — placeholder até endpoint disponível */}
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400 mb-4">
                <BarChart2 className="w-8 h-8 opacity-30" />
                <p className="text-sm">Histórico de eventos em desenvolvimento</p>
                <p className="text-xs text-gray-300">Requer endpoint de série histórica por unidade</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">Média histórica</span>
                  <span className="font-medium">{unidadeAtual.eventos_media_hist.toLocaleString("pt-BR")} ev/sem</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">Última atividade</span>
                  <span className="font-medium">
                    {unidadeAtual.ultima_atividade
                      ? new Date(unidadeAtual.ultima_atividade).toLocaleString("pt-BR")
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">Sem eventos há</span>
                  <span className={`font-medium ${unidadeAtual.horas_sem_evento >= 48 ? "text-red-600" : "text-gray-800"}`}>
                    {unidadeAtual.horas_sem_evento}h
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">População cadastrada</span>
                  <span className="font-medium">{(unidadeAtual.populacao ?? 0).toLocaleString("pt-BR")}</span>
                </div>
              </div>
            </Card>
          ) : (
            <Card title="Regras de alerta (RF-15)">
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="font-semibold text-yellow-800">Aviso — 24h sem eventos</p>
                  <p className="text-yellow-700 text-xs mt-0.5">Unidade sem registros por 1 dia.</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="font-semibold text-orange-800">Alerta — 48h sem eventos</p>
                  <p className="text-orange-700 text-xs mt-0.5">Severidade crescente a cada faixa.</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-semibold text-red-800">Crítico — 72h ou queda {">"} 30%</p>
                  <p className="text-red-700 text-xs mt-0.5">Ausência prolongada ou queda brusca vs. histórico.</p>
                </div>
                <p className="text-xs text-gray-400 mt-2">Selecione uma unidade na tabela para ver o detalhamento.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
