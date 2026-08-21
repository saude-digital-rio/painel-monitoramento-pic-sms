import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";
import { LogIn, LogOut, TrendingUp, TrendingDown, Minus } from "lucide-react";

function VariacaoTag({ variacao }: { variacao: number | null }) {
  if (variacao === null) return <span className="text-xs text-gray-400">—</span>;
  const positivo = variacao > 0;
  const neutro = variacao === 0;
  const Icon = neutro ? Minus : positivo ? TrendingUp : TrendingDown;
  const cls = neutro
    ? "text-gray-500"
    : positivo
      ? "text-green-600"
      : "text-red-500";
  const sinal = positivo ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${cls}`}>
      <Icon className="w-3 h-3" />
      {sinal}{variacao.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
    </span>
  );
}

export async function MovimentacaoInfanciaAsync() {
  const data = await api.populacao.movimentacaoInfancia();

  if (!data) return <ApiErrorCard />;

  const saldoStr =
    data.saldo > 0
      ? `+${data.saldo.toLocaleString("pt-BR")}`
      : data.saldo.toLocaleString("pt-BR");

  return (
    <Card
      title="Movimentação da infância"
      tooltip="Crianças que entraram ou saíram do cadastro de Infância na semana atual. Entram as nascidas nesta semana; saem as que completaram 6 anos."
    >
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Entraram */}
        <div className="rounded-xl bg-green-50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <LogIn className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-snug">Entraram esta semana</p>
            <p className="text-2xl font-bold text-green-600 tabular-nums leading-tight">
              {data.entraram.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        {/* Saíram */}
        <div className="rounded-xl bg-red-50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 leading-snug">Saíram esta semana</p>
            <p className="text-2xl font-bold text-red-500 tabular-nums leading-tight">
              {data.sairam.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </div>

      {/* Saldo */}
      <div className="rounded-xl bg-gray-50 p-4 mb-3">
        <p className="text-sm font-medium text-gray-700 mb-1">Saldo da semana</p>
        <p className="text-3xl font-bold tabular-nums" style={{ color: "#3b82f6" }}>
          {saldoStr}
        </p>
      </div>

      {/* Comparação com padrão recente */}
      <div className="rounded-xl border border-gray-100 p-3 space-y-2">
        <div className="mb-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Comparação com o padrão recente
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Média das últimas 4 semanas</p>
        </div>

        {/* Entradas */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600 w-14 shrink-0">Entradas</span>
          <span className="text-sm font-semibold tabular-nums text-gray-800">{data.entraram.toLocaleString("pt-BR")}</span>
          <span className="text-sm text-gray-400 tabular-nums flex-1">
            vs média semanal {Math.round(data.media_entradas_4_semanas ?? 0).toLocaleString("pt-BR")}
          </span>
          <VariacaoTag variacao={data.variacao_entradas ?? null} />
        </div>

        {/* Saídas */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600 w-14 shrink-0">Saídas</span>
          <span className="text-sm font-semibold tabular-nums text-gray-800">{data.sairam.toLocaleString("pt-BR")}</span>
          <span className="text-sm text-gray-400 tabular-nums flex-1">
            vs média semanal {Math.round(data.media_saidas_4_semanas ?? 0).toLocaleString("pt-BR")}
          </span>
          <VariacaoTag variacao={data.variacao_saidas ?? null} />
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3 leading-relaxed">
        Contagem de segunda-feira até hoje.
      </p>
    </Card>
  );
}
