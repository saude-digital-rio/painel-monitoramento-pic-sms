import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";

function MetricCell({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: number;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div className="py-1">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${alert && value > 0 ? "text-red-600" : "text-gray-800"}`}>
        {value.toLocaleString("pt-BR")}
      </p>
      {sub && <p className="text-xs text-gray-400 font-mono mt-0.5">{sub}</p>}
    </div>
  );
}

export async function QualidadeCadastroAsync() {
  const data = await api.populacao.cadastro();

  return (
    <Card
      title="Qualidade do cadastro Vitacare"
      tooltip="Validade dos dados cadastrais dos pacientes: CPF com formato inválido, datas de nascimento incorretas e falta de vínculo com a população-alvo."
    >
      {data ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
          <MetricCell label="Total de pacientes" value={data.total_pacientes} />
          <MetricCell label="Datas de nascimento inválidas" value={data.nascimento_invalido} sub="data_nascimento" alert />
          <MetricCell label="CPFs com formato inválido" value={data.cpf_invalido} sub="cpf_valido_indicador = FALSE" alert />
          <MetricCell label="Sem CPF" value={data.sem_cpf} sub="cpf IS NULL" alert />
          <MetricCell label="Novos cadastros (mês)" value={data.crescimento_mensal} />
          <MetricCell label="Cadastros permanentes" value={data.cadastro_permanente} />
          {data.criancas_sem_populacao_alvo !== null && (
            <MetricCell label="Crianças fora da população-alvo" value={data.criancas_sem_populacao_alvo ?? 0} sub="sem match em publico_alvo" alert />
          )}
        </div>
      ) : (
        <ApiErrorCard />
      )}
    </Card>
  );
}
