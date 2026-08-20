import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";
import { CheckCircle, XCircle } from "lucide-react";

export async function GestacaoCadastroAsync() {
  const [gestacaoReal, cadastroReal] = await Promise.all([
    api.populacao.gestacoes(),
    api.populacao.cadastro(),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Monitoramento de gestações" tooltip="Anomalias nos registros de gestação: datas nulas ou no futuro, e pacientes com mais de uma gestação ativa ao mesmo tempo.">
        {gestacaoReal ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Gestações ativas", value: gestacaoReal.gestacoes_ativas, ok: true },
              { label: "Puerpério ativo", value: gestacaoReal.puerperio_ativo, ok: true },
              { label: "Datas nulas", value: gestacaoReal.data_nula, ok: gestacaoReal.data_nula === 0 },
              { label: "Datas futuras", value: gestacaoReal.data_futura, ok: gestacaoReal.data_futura === 0 },
              { label: "Múltiplas gestações ativas", value: gestacaoReal.multiplas_gestacoes_ativas, ok: gestacaoReal.multiplas_gestacoes_ativas === 0 },
              { label: "Novas na semana", value: gestacaoReal.novas_gestacoes_semana, ok: true },
              { label: "Encerradas na semana", value: gestacaoReal.encerradas_semana, ok: true },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg p-3 border ${item.ok ? "bg-gray-50 border-gray-100" : "bg-red-50 border-red-200"}`}>
                <p className="text-xs text-gray-500">{item.label}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {!item.ok && item.value > 0 ? (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  )}
                  <p className={`text-lg font-bold ${!item.ok && item.value > 0 ? "text-red-700" : "text-gray-800"}`}>
                    {item.value.toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ApiErrorCard />
        )}
      </Card>

      <Card title="Qualidade do cadastro Vitacare" tooltip="Validade dos dados cadastrais dos pacientes: CPF com formato inválido, datas de nascimento incorretas e falta de vínculo com a população-alvo.">
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
