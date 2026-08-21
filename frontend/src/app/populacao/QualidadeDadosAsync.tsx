import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";
import { AlertTriangle, CheckCircle } from "lucide-react";

function MetricRow({ label, sub, value }: { label: string; sub: string; value: number }) {
  const isAlert = value > 0;
  return (
    <div className={`flex items-start gap-3 rounded-lg p-3.5 border ${isAlert ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"}`}>
      <div className="mt-0.5 shrink-0">
        {isAlert
          ? <AlertTriangle className="w-4 h-4 text-amber-500" />
          : <CheckCircle className="w-4 h-4 text-green-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isAlert ? "text-amber-900" : "text-gray-700"}`}>{label}</p>
        <p className={`text-xs mt-0.5 ${isAlert ? "text-amber-600" : "text-gray-400"}`}>{sub}</p>
      </div>
      <span className={`text-lg font-bold tabular-nums shrink-0 ${isAlert ? "text-amber-700" : "text-gray-500"}`}>
        {value.toLocaleString("pt-BR")}
      </span>
    </div>
  );
}

export async function QualidadeDadosAsync() {
  const data = await api.populacao.gestacoes();

  return (
    <Card
      title="Qualidade dos dados de gestação e puerpério"
      tooltip="Problemas e ausências nos dados usados para montar as populações de gestantes e puérperas."
    >
      {data ? (
        <div className="space-y-2.5">
          <MetricRow
            label="Múltiplas gestações ativas por CPF"
            sub="Possível inconsistência de classificação"
            value={data.multiplas_gestacoes_ativas}
          />
          <MetricRow
            label="Sem equipe de Saúde da Família identificada"
            sub="Ausência de vínculo assistencial"
            value={data.sem_equipe}
          />
        </div>
      ) : (
        <ApiErrorCard />
      )}
    </Card>
  );
}
