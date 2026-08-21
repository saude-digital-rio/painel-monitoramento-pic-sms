import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";

export async function PerfilInfanciaAsync() {
  const data = await api.populacao.perfilInfancia();

  if (!data) return <ApiErrorCard />;

  const faixas = [
    { label: "< 1 ano", count: data.faixa_0_1 },
    { label: "1 a < 2 anos", count: data.faixa_1_2 },
    { label: "2 a < 4 anos", count: data.faixa_2_4 },
    { label: "4 a < 6 anos", count: data.faixa_4_6 },
  ];
  const total = faixas.reduce((s, f) => s + f.count, 0) || 1;
  const maxFaixa = Math.max(...faixas.map((f) => f.count), 1);

  return (
    <Card
      title="Perfil da população infantil"
      tooltip="Composição do cadastro de crianças por faixa etária, próximas saídas por completar 6 anos, nascimentos recentes e crianças sem CPF que não entram na população-alvo."
    >
      {/* Distribuição etária */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
        Distribuição por faixa etária
      </p>
      <div className="space-y-4 mb-5">
        {faixas.map(({ label, count }) => {
          const barPct = Math.round((count / maxFaixa) * 100);
          const totalPct = ((count / total) * 100).toFixed(1);
          return (
            <div key={label} className="flex items-center gap-4">
              <span className="text-sm text-gray-700 w-24 shrink-0">{label}</span>
              <div className="flex-1 h-3.5 rounded-full overflow-hidden" style={{ backgroundColor: "#dbeafe" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${barPct}%`, backgroundColor: "#3b82f6" }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-800 tabular-nums w-20 text-right shrink-0">
                {count.toLocaleString("pt-BR")}
              </span>
              <span className="text-sm tabular-nums w-12 text-right shrink-0" style={{ color: "#3b82f6" }}>
                {totalPct}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Três métricas complementares */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
        {/* Completam 6 anos em 30 dias */}
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
          <p className="text-[11px] text-amber-700 font-medium leading-snug mb-2">
            Completam 6 anos nos próximos 30 dias
          </p>
          <p className="text-xl font-bold text-amber-600 tabular-nums">
            {data.completam_6_anos_30d.toLocaleString("pt-BR")}
          </p>
          <p className="text-[10px] text-amber-500 mt-1">Próximas saídas da faixa</p>
        </div>

        {/* Nascimentos nos últimos 30 dias */}
        <div className="rounded-lg bg-green-50 border border-green-100 p-3">
          <p className="text-[11px] text-green-700 font-medium leading-snug mb-2">
            Nascimentos nos últimos 30 dias
          </p>
          <p className="text-xl font-bold text-green-600 tabular-nums">
            {data.nascimentos_30d.toLocaleString("pt-BR")}
          </p>
          <p className="text-[10px] text-green-500 mt-1">Por data de nascimento</p>
        </div>

        {/* Sem CPF */}
        <div className="rounded-lg bg-red-50 border border-red-100 p-3">
          <p className="text-[11px] text-red-700 font-medium leading-snug mb-2">
            {"< 6 anos sem CPF"}
          </p>
          <p className="text-xl font-bold text-red-500 tabular-nums">
            {data.sem_cpf_menores_6.toLocaleString("pt-BR")}
          </p>
          <p className="text-[10px] text-red-400 mt-1">Potencial público alvo perdido</p>
        </div>
      </div>

    </Card>
  );
}
