import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group ml-1.5 inline-flex items-center align-middle">
      <span className="w-3.5 h-3.5 rounded-full border border-gray-400 text-gray-400 text-[9px] font-bold flex items-center justify-center cursor-default select-none leading-none">i</span>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 rounded-lg bg-gray-900 text-white text-xs leading-relaxed px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg whitespace-normal">
        {text}
        <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

function MetricCard({
  label,
  sub,
  value,
  tooltip,
}: {
  label: string;
  sub: string;
  value: number;
  tooltip?: string;
}) {
  const isAlert = value > 0;
  return (
    <div className={`rounded-lg p-4 border ${isAlert ? "bg-amber-50 border-amber-100" : "bg-green-50 border-green-100"}`}>
      <p className={`text-xs font-medium mb-2 leading-snug ${isAlert ? "text-amber-800" : "text-green-800"}`}>
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </p>
      <p className={`text-2xl font-bold tabular-nums ${isAlert ? "text-amber-700" : "text-green-700"}`}>
        {value.toLocaleString("pt-BR")}
      </p>
      <p className={`text-xs mt-1.5 leading-snug ${isAlert ? "text-amber-600" : "text-green-600"}`}>{sub}</p>
    </div>
  );
}

export async function GestacaoQualidadeAsync() {
  const data = await api.populacao.gestacoes();

  return (
    <Card
      title="Gestação e puerpério — monitoramento e qualidade"
      tooltip="Anomalias nos registros de gestação e puerpério: encerramento por limite do modelo, DPP ultrapassada, sobreposição de registros e ausência de vínculo assistencial."
    >
      {data ? (
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Gestações sem fechamento após a DPP estimada"
            sub="DPP já ultrapassada e nenhuma data de encerramento identificada."
            value={data.ativas_dpp_ultrapassada}
            tooltip="A DPP é uma data estimada, calculada como 40 semanas após o início da gestação. Estes casos continuam classificados como Gestação porque ainda não foi identificada uma data de encerramento. Se nenhum fechamento for encontrado, o modelo encerra a gestação automaticamente ao atingir 299 dias."
          />
          <MetricCard
            label="Gestações encerradas automaticamente sem fechamento identificado"
            sub="Gestação atingiu 299 dias sem data de encerramento identificada."
            value={data.encerradas_sem_fechamento}
            tooltip="A gestação foi encerrada automaticamente pelo modelo ao atingir 299 dias, porque não foi identificada uma data de fechamento. Sem esse fechamento, o início do puerpério pode não ser identificado pelo modelo."
          />
          <MetricCard
            label="Múltiplas gestações ativas por CPF"
            sub="Possível inconsistência de classificação."
            value={data.multiplas_gestacoes_ativas}
          />
          <MetricCard
            label="Sem equipe de Saúde da Família identificada"
            sub="Nenhuma equipe vinculada encontrada para a gestação/puerpério."
            value={data.sem_equipe}
          />
        </div>
      ) : (
        <ApiErrorCard />
      )}
    </Card>
  );
}
