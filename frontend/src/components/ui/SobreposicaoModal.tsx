"use client";

import { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";

const SEG_COLORS: Record<string, string> = {
  Gestacao: "bg-purple-100 text-purple-700",
  Puerperio: "bg-pink-100 text-pink-700",
  Infancia: "bg-blue-100 text-blue-700",
};

const SEG_LABELS: Record<string, string> = {
  Gestacao: "Gestação",
  Puerperio: "Puerpério",
  Infancia: "Infância",
};

export function SobreposicaoModal({ count }: { count: number }) {
  const [aberto, setAberto] = useState(false);
  const [rows, setRows] = useState<{ cpf: string; segmentos: string[] }[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function abrirModal() {
    setAberto(true);
    if (rows !== null) return;
    setLoading(true);
    const data = await api.populacao.sobreposicao();
    setRows(data ?? []);
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={abrirModal}
        className="w-full text-left mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors cursor-pointer"
      >
        <p className="text-xs text-yellow-800 font-medium">
          ⚠ {count} CPFs em mais de um segmento — clique para ver
        </p>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">CPFs em múltiplos segmentos</h2>
                <p className="text-xs text-gray-400 mt-0.5">{count} ocorrências · máx. 500 exibidas</p>
              </div>
              <button onClick={() => setAberto(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-3">
              {loading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Carregando...</span>
                </div>
              ) : rows && rows.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">Nenhum CPF encontrado.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase">CPF</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase">Segmentos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(rows ?? []).map((r) => (
                      <tr key={r.cpf}>
                        <td className="py-2.5 font-mono text-gray-700 pr-4">{r.cpf}</td>
                        <td className="py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {r.segmentos.map((s) => (
                              <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEG_COLORS[s] ?? "bg-gray-100 text-gray-600"}`}>
                                {SEG_LABELS[s] ?? s}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
