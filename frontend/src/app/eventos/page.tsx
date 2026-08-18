import { Header } from "@/components/layout/Header";
import { Card, StatCard } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { MultiLineChart } from "@/components/charts/LineChart";
import { MultiBarChart } from "@/components/charts/BarChart";
import { EventoSegmentoTable } from "@/components/tables/EventoSegmentoTable";
import { api } from "@/lib/api/client";
import { Activity, AlertTriangle } from "lucide-react";

const TIPO_COLORS: Record<string, string> = {
  consulta: "#3b82f6",
  visita: "#10b981",
  teste_hiv: "#8b5cf6",
  teste_sifilis: "#f59e0b",
  teste_hepb: "#ef4444",
  teste_hepc: "#ec4899",
  vacina_d3: "#06b6d4",
  diagnostico: "#6366f1",
};

export default async function EventosPage() {
  const [serieReal, coberturaReal, consistenciaReal, eventoSegReal, completudeReal] = await Promise.all([
    api.eventos.serie(30),
    api.eventos.cobertura(),
    api.eventos.consistenciaDatas(),
    api.eventos.eventoSegmento(),
    api.eventos.completude(),
  ]);

  const totais = serieReal
    ? serieReal.reduce(
        (acc, d) => ({
          consulta: acc.consulta + (d.consulta ?? 0),
          visita: acc.visita + (d.visita ?? 0),
          testes: acc.testes + (d.teste_hiv ?? 0) + (d.teste_sifilis ?? 0) + (d.teste_hepb ?? 0) + (d.teste_hepc ?? 0),
          vacina: acc.vacina + (d.vacina_d3 ?? 0),
          diagnostico: acc.diagnostico + (d.diagnostico ?? 0),
        }),
        { consulta: 0, visita: 0, testes: 0, vacina: 0, diagnostico: 0 }
      )
    : null;

  const cobertura = coberturaReal
    ? {
        gestacao: coberturaReal.find((c) => c.segmento === "Gestacao"),
        puerperio: coberturaReal.find((c) => c.segmento === "Puerperio"),
        infancia: coberturaReal.find((c) => c.segmento === "Infancia"),
      }
    : null;

  const incompatíveis = eventoSegReal?.filter((e) => !e.compativel) ?? [];

  return (
    <div>
      <Header
        title="Eventos"
        subtitle="Cobertura, volume, consistência temporal e tipos de evento por segmento (RF-05, RF-06, RF-16, RF-18)"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Consultas (30d)" value={totais?.consulta ?? "—"} icon={<Activity className="w-5 h-5" />} color="blue" />
        <StatCard label="Visitas dom. (30d)" value={totais?.visita ?? "—"} icon={<Activity className="w-5 h-5" />} color="green" />
        <StatCard label="Testes rápidos (30d)" value={totais?.testes ?? "—"} icon={<Activity className="w-5 h-5" />} color="purple" />
        <StatCard label="Vacinas D3 (30d)" value={totais?.vacina ?? "—"} icon={<Activity className="w-5 h-5" />} color="orange" />
        <StatCard label="Diagnósticos (30d)" value={totais?.diagnostico ?? "—"} icon={<Activity className="w-5 h-5" />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Volume de consultas e visitas domiciliares (últimos 30 dias)" tooltip="Quantidade diária de consultas e visitas domiciliares registradas nos últimos 30 dias.">
          {serieReal ? (
            <MultiLineChart
              data={serieReal}
              lines={[
                { key: "consulta", label: "Consulta", color: TIPO_COLORS.consulta },
                { key: "visita", label: "Visita Domiciliar", color: TIPO_COLORS.visita },
              ]}
              height={220}
            />
          ) : (
            <ApiErrorCard />
          )}
        </Card>

        <Card title="Testes rápidos por tipo (30 dias)" tooltip="Volume diário de testes rápidos realizados nos últimos 30 dias, separados por tipo (HIV, sífilis, hepatite B e C).">
          {serieReal ? (
            <MultiLineChart
              data={serieReal}
              lines={[
                { key: "teste_hiv", label: "HIV", color: TIPO_COLORS.teste_hiv },
                { key: "teste_sifilis", label: "Sífilis", color: TIPO_COLORS.teste_sifilis },
                { key: "teste_hepb", label: "Hep. B", color: TIPO_COLORS.teste_hepb },
                { key: "teste_hepc", label: "Hep. C", color: TIPO_COLORS.teste_hepc },
              ]}
              height={220}
            />
          ) : (
            <ApiErrorCard />
          )}
        </Card>
      </div>

      {/* Cobertura */}
      <Card title="Cobertura de eventos por segmento (RF-05)" className="mb-6" tooltip="Percentual da população-alvo com ao menos um evento registrado (consulta, visita ou teste). Meta recomendada: ≥ 85%.">
        {cobertura && cobertura.gestacao && cobertura.puerperio && cobertura.infancia ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { label: "Gestação", data: cobertura.gestacao },
              { label: "Puerpério", data: cobertura.puerperio },
              { label: "Infância", data: cobertura.infancia },
            ].map((seg) => (
              <div key={seg.label} className="border border-gray-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">{seg.label}</p>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Com evento</span>
                  <span className="font-bold text-gray-800">{seg.data.com_evento.toLocaleString("pt-BR")}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${seg.data.cobertura_pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-3">
                  <span>{seg.data.cobertura_pct}% com pelo menos 1 evento</span>
                  <span>{seg.data.sem_evento.toLocaleString("pt-BR")} sem evento</span>
                </div>
                {seg.data.cobertura_pct < 85 && (
                  <div className="flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 rounded-lg px-2.5 py-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Cobertura abaixo de 85%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <ApiErrorCard />
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Consistência de datas */}
        <Card title="Consistência das datas (RF-06)" tooltip="Eventos com datas inválidas: no futuro, anteriores ao nascimento da paciente ou fora da janela de monitoramento esperada.">
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

        {/* Completude da saída */}
        <Card title="Completude dos campos de saída (RF-18)" tooltip="Campos obrigatórios nos registros de eventos exportados que estão nulos ou inválidos. Qualquer valor acima de 0 indica problema na saída.">
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

      {/* Evento x Segmento */}
      <Card title="Compatibilidade de eventos por segmento (RF-16)" subtitle="Detecta eventos registrados para o segmento errado" tooltip="Sinaliza quando um tipo de evento não deveria ser aplicado àquele segmento. Ex: vacina pentavalente D3 (exclusiva de crianças) registrada para gestante ou puerpério. Qualquer linha 'Improvável' indica possível erro de cadastro.">
        {eventoSegReal ? (
          <>
            {/* Resumo de status */}
            <div className="flex gap-3 mb-4">
              {incompatíveis.length > 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-sm text-red-700 font-medium">
                    {incompatíveis.length} {incompatíveis.length > 1 ? "combinações improváveis detectadas" : "combinação improvável detectada"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-green-600 text-sm font-medium">✓ Todas as combinações são compatíveis</span>
                </div>
              )}
            </div>

            <EventoSegmentoTable rows={eventoSegReal} />
          </>
        ) : (
          <ApiErrorCard />
        )}
      </Card>

      {/* Regras de compatibilidade */}
      <Card title="Regras de compatibilidade evento × segmento" className="mt-6" tooltip="Matriz estática definida no backend (RF-16). Combinações marcadas com ✗ são sinalizadas como 'Improvável' na tabela acima.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Tipo de evento</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-purple-500 uppercase">Gestação</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-pink-500 uppercase">Puerpério</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-blue-500 uppercase">Infância</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Motivo da restrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                {
                  evento: "Consulta",
                  gestacao: true, puerperio: true, infancia: true,
                  motivo: null,
                },
                {
                  evento: "Visita Domiciliar",
                  gestacao: true, puerperio: true, infancia: true,
                  motivo: null,
                },
                {
                  evento: "Teste rápido - HIV",
                  gestacao: true, puerperio: true, infancia: false,
                  motivo: "Crianças < 6 anos não são público-alvo de testes de HIV",
                },
                {
                  evento: "Teste rápido - Sífilis",
                  gestacao: true, puerperio: true, infancia: false,
                  motivo: "Crianças < 6 anos não são público-alvo de testes de sífilis",
                },
                {
                  evento: "Teste rápido - Hepatite B",
                  gestacao: true, puerperio: true, infancia: false,
                  motivo: "Crianças < 6 anos não são público-alvo de testes de hepatite B",
                },
                {
                  evento: "Teste rápido - Hepatite C",
                  gestacao: true, puerperio: true, infancia: false,
                  motivo: "Crianças < 6 anos não são público-alvo de testes de hepatite C",
                },
                {
                  evento: "Vacina - Pentavalente - D3",
                  gestacao: false, puerperio: false, infancia: true,
                  motivo: "Vacina infantil — não aplicável a gestantes ou puérperas",
                },
                {
                  evento: "Diagnóstico",
                  gestacao: true, puerperio: true, infancia: true,
                  motivo: null,
                },
              ].map((row) => (
                <tr key={row.evento} className={(!row.gestacao || !row.puerperio || !row.infancia) ? "bg-red-50/40" : undefined}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{row.evento}</td>
                  {[row.gestacao, row.puerperio, row.infancia].map((ok, i) => (
                    <td key={i} className="px-4 py-2.5 text-center">
                      {ok
                        ? <span className="text-green-600 font-bold text-base">✓</span>
                        : <span className="text-red-500 font-bold text-base">✗</span>
                      }
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-xs text-gray-500">{row.motivo ?? <span className="text-gray-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">Regras definidas em <span className="font-mono">backend/app/routers/eventos.py</span> · constante <span className="font-mono">INCOMPATIVEIS</span></p>
      </Card>
    </div>
  );
}
