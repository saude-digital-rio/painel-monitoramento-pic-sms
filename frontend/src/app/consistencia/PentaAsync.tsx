import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";
import { AlertTriangle } from "lucide-react";

export async function PentaAsync() {
  const [pentaReal, coberturaReal] = await Promise.all([
    api.vacinacao.pentavalente(),
    api.vacinacao.coberturaDois(),
  ]);

  return (
    <Card title="Sequência da pentavalente D1→D2→D3" tooltip="Verifica se crianças com D3 registrada também possuem D1 e D2, e se o intervalo entre doses está dentro do esperado (28–90 dias).">
      {pentaReal ? (
        <div className="space-y-3">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Crianças com D3 registrada</p>
            <p className="text-3xl font-bold text-blue-800 mt-1">{pentaReal.criancas_com_d3.toLocaleString("pt-BR")}</p>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Com D3, D2 e D1</span>
                <span className="font-semibold text-blue-900">{pentaReal.com_d3_e_d2_e_d1.toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-2 bg-blue-200 rounded-full">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(pentaReal.com_d3_e_d2_e_d1 / (pentaReal.criancas_com_d3 || 1) * 100).toFixed(0)}%` }} />
              </div>
            </div>
          </div>

          {[
            { label: "Com D3 mas sem D2", value: pentaReal.com_d3_sem_d2, pct: (pentaReal.com_d3_sem_d2 / (pentaReal.criancas_com_d3 || 1) * 100).toFixed(1) },
            { label: "Com D3 mas sem D1", value: pentaReal.com_d3_sem_d1, pct: (pentaReal.com_d3_sem_d1 / (pentaReal.criancas_com_d3 || 1) * 100).toFixed(1) },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-sm text-red-700">{item.label}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-800">{item.value.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-red-600">{item.pct}%</p>
              </div>
            </div>
          ))}

          <div className="border border-gray-100 rounded-lg p-3">
            <p className="text-sm font-semibold text-gray-700 mb-2">Intervalo D2→D3</p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center p-2 bg-green-50 rounded-lg border border-green-100">
                <p className="text-xs text-green-600">OK (28–90 dias)</p>
                <p className="font-bold text-green-800">{pentaReal.intervalo_d2_d3_ok.toLocaleString("pt-BR")}</p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-red-600">{"< 28 dias"}</p>
                <p className="font-bold text-red-800">{pentaReal.intervalo_d2_d3_menor_28d}</p>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-700">{"> 90 dias"}</p>
                <p className="font-bold text-yellow-800">{pentaReal.intervalo_d2_d3_maior_90d}</p>
              </div>
            </div>
          </div>

          {pentaReal.nomes_nao_mapeados.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-1">Nomes não mapeados pelo filtro</p>
              <div className="flex flex-wrap gap-1">
                {pentaReal.nomes_nao_mapeados.map((n) => (
                  <span key={n} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full border border-orange-200">{n}</span>
                ))}
              </div>
            </div>
          )}

          {coberturaReal && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-1">Cobertura de D3 entre crianças da população-alvo</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Crianças alvo: {coberturaReal.criancas_alvo.toLocaleString("pt-BR")}</span>
                <span className="font-bold text-gray-800">{coberturaReal.cobertura_pct}% com D3</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ApiErrorCard />
      )}
    </Card>
  );
}
