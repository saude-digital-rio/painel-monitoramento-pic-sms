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
  const bgClass = info
    ? "bg-blue-50 border-blue-100"
    : isAlert
    ? "bg-amber-50 border-amber-100"
    : "bg-gray-50 border-gray-100";
  const iconEl = info
    ? <Info className="w-4 h-4 text-blue-400" />
    : isAlert
    ? <AlertTriangle className="w-4 h-4 text-amber-500" />
    : <CheckCircle className="w-4 h-4 text-green-500" />;
  const labelClass = info ? "text-blue-900" : isAlert ? "text-amber-900" : "text-gray-700";
  const subClass = info ? "text-blue-500" : isAlert ? "text-amber-600" : "text-gray-400";
  const valueClass = info ? "text-blue-700" : isAlert ? "text-amber-700" : "text-gray-500";

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

export async function GestacaoCadastroAsync() {
  const [gestacaoReal, cadastroReal] = await Promise.all([
    api.populacao.gestacoes(),
    api.populacao.cadastro(),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Card 1 — Fluxo de classificação */}
        <Card
          title="Monitoramento de gestações e puerpério"
          tooltip="Acompanha o fluxo de identificação das fases que afetam os protocolos do PIC: encerramento de gestações e formação do puerpério."
        >
          {gestacaoReal ? (
            <div className="space-y-2.5">
              <MetricRow
                label="Gestações sem fechamento após a DPP estimada"
                sub="DPP ultrapassada e sem encerramento identificado"
                tooltip="A DPP é uma data estimada, calculada como 40 semanas após o início da gestação. Estes casos continuam classificados como Gestação porque ainda não foi identificada uma data de encerramento. Se nenhum fechamento for encontrado, o modelo encerra a gestação automaticamente ao atingir 299 dias."
                value={gestacaoReal.ativas_dpp_ultrapassada}
                alert
              />
              <MetricRow
                label="Gestações encerradas automaticamente sem fechamento identificado"
                sub="Gestação atingiu 299 dias sem data de encerramento identificada"
                tooltip="A gestação foi encerrada automaticamente pelo modelo ao atingir 299 dias, porque não foi identificada uma data de fechamento. Sem esse fechamento, o início do puerpério pode não ser identificado pelo modelo."
                value={gestacaoReal.encerradas_sem_fechamento}
                alert
              />
              <MetricRow
                label="Puérperas identificadas atualmente"
                sub="Registros ativos na fase de puerpério"
                value={gestacaoReal.puerperio_ativo}
                info
              />
            </div>
          ) : (
            <ApiErrorCard />
          )}
        </Card>

        {/* Card 2 — Qualidade dos dados */}
        <Card
          title="Qualidade dos dados de gestação e puerpério"
          tooltip="Problemas e ausências nos dados usados para montar as populações de gestantes e puérperas."
        >
          {gestacaoReal ? (
            <div className="space-y-2.5">
              <MetricRow
                label="Múltiplas gestações ativas por CPF"
                sub="Possível inconsistência de classificação"
                value={gestacaoReal.multiplas_gestacoes_ativas}
                alert
              />
              <MetricRow
                label="Sem equipe de Saúde da Família identificada"
                sub="Ausência de vínculo assistencial"
                value={gestacaoReal.sem_equipe}
                alert
              />
            </div>
          ) : (
            <ApiErrorCard />
          )}
        </Card>
      </div>

      {/* Card 3 — Qualidade do cadastro Vitacare */}
      <Card
        title="Qualidade do cadastro Vitacare"
        tooltip="Validade dos dados cadastrais dos pacientes: CPF com formato inválido, datas de nascimento incorretas e falta de vínculo com a população-alvo."
      >
        {cadastroReal ? (
          <div className="space-y-3">
            {[
              { label: "Total de pacientes", value: cadastroReal.total_pacientes, ok: true, sub: "" },
              { label: "Datas de nascimento inválidas", value: cadastroReal.nascimento_invalido, ok: false, sub: "campo data_nascimento" },
              { label: "CPFs com formato inválido", value: cadastroReal.cpf_invalido, ok: false, sub: "cpf_valido_indicador = FALSE" },
              { label: "Sem CPF", value: cadastroReal.sem_cpf, ok: false, sub: "cpf IS NULL" },
              { label: "Crianças fora da população-alvo", value: cadastroReal.criancas_sem_populacao_alvo ?? 0, ok: false, sub: "sem match em publico_alvo" },
              { label: "Novos cadastros (mês)", value: cadastroReal.crescimento_mensal, ok: true, sub: "crescimento mensal" },
              { label: "Cadastros permanentes", value: cadastroReal.cadastro_permanente, ok: true, sub: "cadastro_permanente_indicador = TRUE" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-700">{item.label}</p>
                  {item.sub && <p className="text-xs text-gray-400 font-mono">{item.sub}</p>}
                </div>
                <span className={`text-sm font-bold ${!item.ok && item.value > 0 ? "text-red-600" : "text-gray-800"}`}>
                  {item.value.toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <ApiErrorCard />
        )}
      </Card>
    </div>
  );
}
