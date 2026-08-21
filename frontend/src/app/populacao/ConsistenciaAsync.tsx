import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";
import { AlertTriangle, CheckCircle } from "lucide-react";

export async function ConsistenciaAsync() {
  const data = await api.populacao.consistencia();
  const taxa = data?.taxa_sobreposicao ?? 0;

  return (
    <Card
      title="Consistência da população-alvo"
      tooltip="CPFs presentes em mais de um segmento simultâneo em publico_alvo."
    >
      {data ? (
        <div className="space-y-3">

          {/* CPFs em múltiplos segmentos */}
          <div className="rounded-xl p-4 bg-amber-50 border border-amber-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-800 leading-snug">
                    CPFs presentes em mais de 1 segmento
                  </p>
                  <span className="text-lg font-bold text-amber-600 tabular-nums shrink-0">
                    {data.cpfs_multiplos_segmentos.toLocaleString("pt-BR")}
                  </span>
                </div>
                {data.combinacoes.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {data.combinacoes.map((c) => (
                      <div key={c.segmentos} className="flex items-center justify-between text-xs text-gray-500">
                        <span>{c.segmentos}</span>
                        <span className="font-semibold text-gray-600 tabular-nums">
                          {c.quantidade_cpfs.toLocaleString("pt-BR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Taxa de sobreposição */}
          <div className="rounded-xl p-4 bg-amber-50 border border-amber-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-amber-600">%</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-800">Taxa de sobreposição</p>
                  <span className="text-lg font-bold text-amber-600 tabular-nums shrink-0">
                    {taxa.toFixed(2).replace(".", ",")}%
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Percentual de CPFs presentes em mais de 1 segmento
                </p>
              </div>
            </div>
          </div>

          {/* CPFs duplicados no mesmo segmento */}
          <div className="rounded-xl p-4 bg-green-50 border border-green-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-800">CPFs duplicados no mesmo segmento</p>
                  <span className="text-lg font-bold text-green-600 tabular-nums shrink-0">0</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Nenhum CPF repetido no mesmo segmento</p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <ApiErrorCard />
      )}
    </Card>
  );
}
