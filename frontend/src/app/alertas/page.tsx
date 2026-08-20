"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { SeveridadeBadge } from "@/components/ui/Badge";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { api, type AlertaAPI } from "@/lib/api/client";
import { Filter, CheckCircle, AlertOctagon } from "lucide-react";

export default function AlertasPage() {
  const [filtroSeveridade, setFiltroSeveridade] = useState<string>("todas");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [mostrarInvestigados, setMostrarInvestigados] = useState(false);
  const [alertaSelecionado, setAlertaSelecionado] = useState<AlertaAPI | null>(null);
  const [alertas, setAlertas] = useState<AlertaAPI[] | null>(null);

  useEffect(() => {
    api.alertas.lista().then((real) => setAlertas(real ?? []));
  }, []);

  if (alertas === null) return <PageSkeleton />;

  const categorias = Array.from(new Set(alertas.map((a) => a.categoria)));

  const alertasFiltrados = alertas.filter((a) => {
    if (!mostrarInvestigados && a.investigado) return false;
    if (filtroSeveridade !== "todas" && a.severidade !== filtroSeveridade) return false;
    if (filtroCategoria !== "todas" && a.categoria !== filtroCategoria) return false;
    return true;
  });

  const resumo = {
    critico: alertas.filter((a) => !a.investigado && a.severidade === "critico").length,
    alerta: alertas.filter((a) => !a.investigado && a.severidade === "alerta").length,
    aviso: alertas.filter((a) => !a.investigado && a.severidade === "aviso").length,
    investigados: alertas.filter((a) => a.investigado).length,
    esperados: alertas.filter((a) => a.esperado).length,
  };

  return (
    <div>
      <Header
        title="Alertas"
        subtitle="Lista consolidada por severidade, histórico e situação da investigação (RF-12)"
        dataRef={alertas[0]?.data}
      />

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Críticos", value: resumo.critico, color: "bg-red-100 border-red-200 text-red-800" },
          { label: "Alertas", value: resumo.alerta, color: "bg-orange-100 border-orange-200 text-orange-800" },
          { label: "Avisos", value: resumo.aviso, color: "bg-yellow-100 border-yellow-200 text-yellow-800" },
          { label: "Investigados", value: resumo.investigados, color: "bg-blue-100 border-blue-200 text-blue-800" },
          { label: "Esperados", value: resumo.esperados, color: "bg-gray-100 border-gray-200 text-gray-700" },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl border px-4 py-3 ${item.color}`}>
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-sm mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
          <span>Filtros:</span>
        </div>
        <select
          value={filtroSeveridade}
          onChange={(e) => setFiltroSeveridade(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todas">Todas as severidades</option>
          <option value="critico">Crítico</option>
          <option value="alerta">Alerta</option>
          <option value="aviso">Aviso</option>
        </select>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todas">Todas as categorias</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarInvestigados}
            onChange={(e) => setMostrarInvestigados(e.target.checked)}
            className="rounded"
          />
          Mostrar investigados
        </label>
        <span className="text-xs text-gray-400 ml-auto">{alertasFiltrados.length} alertas</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista */}
        <div className="lg:col-span-2 space-y-2">
          {alertasFiltrados.map((a) => (
            <div
              key={a.id}
              className={`bg-white rounded-xl border shadow-sm p-4 cursor-pointer transition-all ${
                alertaSelecionado?.id === a.id ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
              } ${a.investigado ? "opacity-60" : ""}`}
              onClick={() => setAlertaSelecionado(alertaSelecionado?.id === a.id ? null : a)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {a.investigado ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertOctagon className={`w-4 h-4 ${a.severidade === "critico" ? "text-red-500" : a.severidade === "alerta" ? "text-orange-500" : "text-yellow-500"}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeveridadeBadge severidade={a.severidade} />
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{a.categoria}</span>
                    {a.esperado && <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Esperado</span>}
                    {a.investigado && <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Investigado</span>}
                  </div>
                  <p className="text-sm text-gray-800 mt-1.5 leading-snug">{a.descricao}</p>
                  <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{new Date(a.data).toLocaleString("pt-BR")}</span>
                    <span className="font-mono truncate">{a.tabela}</span>
                    {a.segmento && <span className="text-purple-500">{a.segmento}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {alertasFiltrados.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum alerta com os filtros selecionados</p>
            </div>
          )}
        </div>

        {/* Detalhe */}
        <div>
          {alertaSelecionado ? (
            <Card title={`Alerta ${alertaSelecionado.id}`}>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Severidade</p>
                  <div className="mt-1"><SeveridadeBadge severidade={alertaSelecionado.severidade} /></div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Categoria</p>
                  <p className="mt-1 text-gray-800">{alertaSelecionado.categoria}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Descrição</p>
                  <p className="mt-1 text-gray-800 leading-relaxed">{alertaSelecionado.descricao}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Tabela</p>
                  <p className="mt-1 font-mono text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded">{alertaSelecionado.tabela}</p>
                </div>
                {alertaSelecionado.segmento && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Segmento</p>
                    <p className="mt-1 text-gray-800">{alertaSelecionado.segmento}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Detectado em</p>
                  <p className="mt-1 text-gray-800">{new Date(alertaSelecionado.data).toLocaleString("pt-BR")}</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 p-2 rounded-lg border text-center text-xs">
                    <p className="text-gray-500">Investigado</p>
                    <p className={`font-semibold mt-0.5 ${alertaSelecionado.investigado ? "text-green-600" : "text-gray-700"}`}>
                      {alertaSelecionado.investigado ? "Sim" : "Não"}
                    </p>
                  </div>
                  <div className="flex-1 p-2 rounded-lg border text-center text-xs">
                    <p className="text-gray-500">Esperado</p>
                    <p className={`font-semibold mt-0.5 ${alertaSelecionado.esperado ? "text-blue-600" : "text-gray-700"}`}>
                      {alertaSelecionado.esperado ? "Sim" : "Não"}
                    </p>
                  </div>
                </div>
                {alertaSelecionado.notas && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Notas da investigação</p>
                    <p className="mt-1 text-gray-700 text-xs leading-relaxed bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                      {alertaSelecionado.notas}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card title="Como usar os alertas">
              <div className="space-y-3 text-sm text-gray-600">
                <p>Selecione um alerta na lista para ver o detalhamento.</p>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-semibold text-gray-700 mb-2">Categorias monitoradas:</p>
                  <ul className="space-y-1.5">
                    {categorias.map((c) => (
                      <li key={c} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
