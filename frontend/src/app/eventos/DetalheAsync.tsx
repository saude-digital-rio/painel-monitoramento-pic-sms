import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";

export async function DetalheAsync() {
  const [consistenciaReal, completudeReal] = await Promise.all([
    api.eventos.consistenciaDatas(),
    api.eventos.completude(),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Consistência das datas" tooltip="Eventos com datas inválidas: no futuro, anteriores ao nascimento da paciente ou fora da janela de monitoramento esperada.">
          {consistenciaReal ? (
            <div className="space-y-3">
              {[
                { label: "Eventos com data no futuro", key: "eventos_futuro" },
                { label: "Eventos anteriores ao nascimento", key: "eventos_antes_nascimento" },
                { label: "Consultas puerperais antes do parto", key: "consultas_puerperais_antes_parto" },
                { label: "Eventos fora da janela (total)", key: "eventos_fora_janela", ok: true },
                { label: "Fora de janela — previsto pelas regras", key: "eventos_fora_janela_esperado", ok: true },
                { label: "Fora de janela — possível anomalia", key: "eventos_fora_janela_anomalia" },
              ].map((item) => {
                const value = (consistenciaReal as Record<string, number>)[item.key] ?? 0;
                const isOk = item.ok ?? false;
                return (
                  <div key={item.label} className={`flex items-center justify-between p-3 rounded-lg border ${!isOk && value > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"}`}>
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <span className={`text-sm font-bold ${!isOk && value > 0 ? "text-red-600" : "text-gray-800"}`}>
                      {value.toLocaleString("pt-BR")}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <ApiErrorCard />
          )}
        </Card>

        <Card title="Completude dos campos de saída" tooltip="Campos obrigatórios nos registros de eventos exportados que estão nulos ou inválidos. Qualquer valor acima de 0 indica problema na saída.">
          {completudeReal ? (
            <div className="space-y-3">
              {[
                { label: "tipo_publico nulo", key: "tipo_publico_nulo" },
                { label: "tipo_evento nulo", key: "tipo_evento_nulo" },
                { label: "data_evento nula", key: "data_evento_nula" },
                { label: "cpf nulo", key: "cpf_nulo" },
                { label: "distancia_dias nula", key: "distancia_dias_nula" },
                { label: "distancia_dias negativa", key: "distancia_dias_negativa" },
                { label: "inicio_fase nulo", key: "inicio_fase_nulo" },
              ].map((item) => {
                const value = (completudeReal as Record<string, number>)[item.key] ?? 0;
                return (
                  <div key={item.label} className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${value > 0 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-100"}`}>
                    <span className="font-mono text-xs text-gray-700">{item.label}</span>
                    <span className={`font-bold ${value > 0 ? "text-yellow-700" : "text-green-700"}`}>
                      {value === 0 ? "✓ 0" : value.toLocaleString("pt-BR")}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <ApiErrorCard />
          )}
        </Card>
    </div>
  );
}
