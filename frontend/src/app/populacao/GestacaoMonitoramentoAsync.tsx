import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

function MetricRow({
  label,
  sub,
  value,
  alert,
  tooltip,
  info,
}: {
  label: string;
  sub: string;
  value: number;
  alert?: boolean;
  tooltip?: string;
  info?: boolean;
}) {
  const isAlert = alert && value > 0;
  let bgClass: string, iconEl: React.ReactNode, labelClass: string, subClass: string, valueClass: string;

  if (info) {
    bgClass = "bg-blue-50 border-blue-100";
    iconEl = <Info className="w-4 h-4 text-blue-400" />;
    labelClass = "text-blue-900";
    subClass = "text-blue-500";
    valueClass = "text-blue-700";
  } else if (isAlert) {
    bgClass = "bg-amber-50 border-amber-100";
    iconEl = <AlertTriangle className="w-4 h-4 text-amber-500" />;
    labelClass = "text-amber-900";
    subClass = "text-amber-600";
    valueClass = "text-amber-700";
  } else {
    bgClass = "bg-gray-50 border-gray-100";
    iconEl = <CheckCircle className="w-4 h-4 text-green-500" />;
    labelClass = "text-gray-700";
    subClass = "text-gray-400";
    valueClass = "text-gray-500";
  }

  return (
    <div className={`flex items-start gap-3 rounded-lg p-3.5 border ${bgClass}`}>
      <div className="mt-0.5 shrink-0">{iconEl}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${labelClass}`}>
          {label}
          {tooltip && (
            <span className="relative group ml-1.5 inline-flex items-center align-middle">
              <span className="w-3.5 h-3.5 rounded-full border border-current text-[9px] font-bold flex items-center justify-center cursor-default select-none leading-none opacity-60">i</span>
              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 rounded-lg bg-gray-900 text-white text-xs leading-relaxed px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg whitespace-normal">
                {tooltip}
                <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900" />
              </span>
            </span>
          )}
        </p>
        <p className={`text-xs mt-0.5 ${subClass}`}>{sub}</p>
      </div>
      <span className={`text-lg font-bold tabular-nums shrink-0 ${valueClass}`}>
        {value.toLocaleString("pt-BR")}
      </span>
    </div>
  );
}

export async function GestacaoMonitoramentoAsync() {
  const data = await api.populacao.gestacoes();

  return (
    <Card
      title="Monitoramento de gestações e puerpério"
      tooltip="Acompanha o fluxo de identificação das fases que afetam os protocolos do PIC: encerramento de gestações e formação do puerpério."
    >
      {data ? (
        <div className="space-y-2.5">
          <MetricRow
            label="Gestações sem fechamento após a DPP estimada"
            sub="DPP já ultrapassada e nenhuma data de encerramento identificada."
            tooltip="A DPP é uma data estimada, calculada como 40 semanas após o início da gestação. Estes casos continuam classificados como Gestação porque ainda não foi identificada uma data de encerramento. Se nenhum fechamento for encontrado, o modelo encerra a gestação automaticamente ao atingir 299 dias."
            value={data.ativas_dpp_ultrapassada}
            alert
          />
          <MetricRow
            label="Gestações encerradas automaticamente sem fechamento identificado"
            sub="Gestação atingiu 299 dias sem data de encerramento identificada"
            tooltip="A gestação foi encerrada automaticamente pelo modelo ao atingir 299 dias, porque não foi identificada uma data de fechamento. Sem esse fechamento, o início do puerpério pode não ser identificado pelo modelo."
            value={data.encerradas_sem_fechamento}
            alert
          />
        </div>
      ) : (
        <ApiErrorCard />
      )}
    </Card>
  );
}
