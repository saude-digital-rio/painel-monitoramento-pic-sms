import { Card } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/Badge";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";

export async function AlertasAsync() {
  const alertasReal = await api.alertas.lista();
  const alertasAtivos = alertasReal?.filter((a) => !a.investigado) ?? [];

  return (
    <Card title="Alertas ativos recentes" padding={false} tooltip="Regras automáticas que detectaram anomalias nos dados: queda de volume, inconsistência entre fontes ou campos inválidos.">
      {alertasReal ? (
        <>
          <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
            {alertasAtivos.slice(0, 6).map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                <StatusDot severidade={a.severidade} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase">{a.categoria}</p>
                  <p className="text-sm text-gray-800 mt-0.5 leading-snug">{a.descricao}</p>
                </div>
              </div>
            ))}
            {alertasAtivos.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">Nenhum alerta ativo.</p>
            )}
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <a href="/alertas" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Ver todos os alertas →
            </a>
          </div>
        </>
      ) : (
        <div className="p-4"><ApiErrorCard /></div>
      )}
    </Card>
  );
}
