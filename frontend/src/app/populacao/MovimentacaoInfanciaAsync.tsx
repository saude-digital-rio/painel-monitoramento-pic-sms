import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";
import { LogIn, LogOut } from "lucide-react";

export async function MovimentacaoInfanciaAsync() {
  const data = await api.populacao.movimentacaoInfancia();

  if (!data) return <ApiErrorCard />;

  const saldoClass =
    data.saldo > 0 ? "text-green-600" : data.saldo < 0 ? "text-orange-600" : "text-gray-500";

  const saldoStr =
    data.saldo > 0
      ? `+${data.saldo.toLocaleString("pt-BR")}`
      : data.saldo.toLocaleString("pt-BR");

  return (
    <Card
      title="Movimentação da infância"
      tooltip="Crianças que entraram ou saíram do cadastro de Infância na semana atual. Entram as nascidas nesta semana; saem as que completaram 6 anos."
    >
      <div className="grid grid-cols-2 gap-3 mb-4">
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

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-sm font-medium text-gray-700">Saldo</span>
        <span className={`text-lg font-bold tabular-nums ${saldoClass}`}>{saldoStr}</span>
      </div>

      <p className="text-xs text-gray-400 mt-3 leading-relaxed">
        Contagem de segunda-feira até hoje.
      </p>
    </Card>
  );
}
