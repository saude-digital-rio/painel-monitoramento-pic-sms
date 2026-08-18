import { Header } from "@/components/layout/Header";
import { Card, StatCard } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { MultiLineChart } from "@/components/charts/LineChart";
import { MultiBarChart } from "@/components/charts/BarChart";
import {
  api,
  type EntradaSaidaAPI,
} from "@/lib/api/client";
import { Users, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const CORES = { Gestacao: "#8b5cf6", Puerperio: "#ec4899", Infancia: "#3b82f6" };

export default async function PopulacaoPage() {
  const [popReal, serieReal, janelasReal, entradasReal, gestacaoReal, cadastroReal] =
    await Promise.all([
      api.populacao.atual(),
      api.populacao.serie(30),
      api.populacao.janelas(),
      api.populacao.entradasSaidas(12),
      api.populacao.gestacoes(),
      api.populacao.cadastro(),
    ]);

  const entradaSaida: EntradaSaidaAPI[] = entradasReal ?? [];

  const entradasPorSemana = entradaSaida
    .filter((e) => e.segmento === "Gestacao")
    .map((e) => {
      const gp = entradaSaida.find((x) => x.data === e.data && x.segmento === "Gestacao");
      const pp = entradaSaida.find((x) => x.data === e.data && x.segmento === "Puerperio");
      const ip = entradaSaida.find((x) => x.data === e.data && x.segmento === "Infancia");
      return {
        data: e.data,
        entradas_gestacao: gp?.entradas ?? 0,
        entradas_puerperio: pp?.entradas ?? 0,
        entradas_infancia: ip?.entradas ?? 0,
      };
    });

  const saidasPorSemana = entradaSaida
    .filter((e) => e.segmento === "Gestacao")
    .map((e) => ({
      data: e.data,
      encerramento: e.saidas_encerramento,
      expiracao: e.saidas_expiracao,
      desaparecimento: e.saidas_desaparecimento,
    }));

  return (
    <div>
      <Header
        title="População-alvo"
        subtitle="Volume por segmento, qualidade cadastral, janelas e anomalias (RF-02, RF-03, RF-04, RF-10, RF-11)"
        dataRef={popReal?.data_referencia ?? undefined}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={popReal?.total ?? "—"} icon={<Users className="w-5 h-5" />} color="blue" />
        <StatCard label="Gestação" value={popReal?.gestacao ?? "—"} sub="janela ≤ 300 dias" icon={<Users className="w-5 h-5" />} color="purple" />
        <StatCard label="Puerpério" value={popReal?.puerperio ?? "—"} sub="janela = 45 dias" icon={<Users className="w-5 h-5" />} color="orange" />
        <StatCard label="Infância" value={popReal?.infancia ?? "—"} sub="nascidos ≤ 6 anos" icon={<Users className="w-5 h-5" />} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Série temporal */}
        <Card title="Novas entradas por dia — últimos 30 dias" tooltip="Quantas pessoas iniciaram sua janela de monitoramento em cada dia, por segmento. Não representa o total acumulado — a maioria da população entrou há mais de 30 dias.">
          {serieReal ? (
            <MultiLineChart
              data={serieReal}
              lines={[
                { key: "gestacao", label: "Gestação", color: CORES.Gestacao },
                { key: "puerperio", label: "Puerpério", color: CORES.Puerperio },
                { key: "infancia", label: "Infância", color: CORES.Infancia },
              ]}
              height={240}
            />
          ) : (
            <ApiErrorCard />
          )}
        </Card>

        {/* Janelas temporais */}
        <Card title="Consistência das janelas temporais (RF-04)" tooltip="Verifica se as datas das janelas estão dentro dos limites: gestação ≤ 300 dias, puerpério = 45 dias exatos, infância ≤ 6 anos.">
          {janelasReal ? (
            <div className="space-y-4">
              {[
                {
                  seg: "Gestação",
                  items: [
                    { label: "Total", value: janelasReal.gestacao.total, ok: true },
                    { label: "Duração zero/negativa", value: janelasReal.gestacao.duracao_zero_negativa, ok: janelasReal.gestacao.duracao_zero_negativa === 0 },
                    { label: "Acima de 300 dias", value: janelasReal.gestacao.acima_300_dias, ok: janelasReal.gestacao.acima_300_dias === 0 },
                    { label: "Média de duração", value: `${janelasReal.gestacao.media_duracao_dias} dias`, ok: true },
                  ],
                },
                {
                  seg: "Puerpério",
                  items: [
                    { label: "Total", value: janelasReal.puerperio.total, ok: true },
                    { label: "Diferente de 45 dias", value: janelasReal.puerperio.diferente_45_dias, ok: janelasReal.puerperio.diferente_45_dias === 0 },
                    { label: "Média de duração", value: `${janelasReal.puerperio.media_duracao_dias} dias`, ok: true },
                  ],
                },
                {
                  seg: "Infância",
                  items: [
                    { label: "Total", value: janelasReal.infancia.total, ok: true },
                    { label: "Diferente de ~6 anos", value: janelasReal.infancia.diferente_6_anos, ok: janelasReal.infancia.diferente_6_anos === 0 },
                    { label: "Média de duração", value: `${janelasReal.infancia.media_duracao_dias} dias`, ok: true },
                  ],
                },
              ].map((seg) => (
                <div key={seg.seg} className="border border-gray-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{seg.seg}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {seg.items.map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{item.label}</span>
                        <span className={`font-semibold flex items-center gap-1 ${!item.ok ? "text-red-600" : "text-gray-800"}`}>
                          {!item.ok && typeof item.value === "number" && item.value > 0 && <AlertTriangle className="w-3 h-3" />}
                          {typeof item.value === "number" ? item.value.toLocaleString("pt-BR") : item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ApiErrorCard />
          )}
        </Card>
      </div>

      {/* Entradas e saídas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Entradas por semana (RF-03)" tooltip="Novos registros adicionados à população-alvo a cada semana, agrupados por segmento (gestação, puerpério, infância).">
          {entradasReal ? (
            <MultiBarChart
              data={entradasPorSemana}
              bars={[
                { key: "entradas_gestacao", label: "Gestação", color: CORES.Gestacao },
                { key: "entradas_puerperio", label: "Puerpério", color: CORES.Puerperio },
                { key: "entradas_infancia", label: "Infância", color: CORES.Infancia },
              ]}
              height={220}
            />
          ) : (
            <ApiErrorCard />
          )}
        </Card>
        <Card title="Saídas por semana com motivo (RF-03)" tooltip="Registros que saíram da população-alvo por semana. Motivos: encerramento da gestação, expiração da janela de monitoramento ou desaparecimento do paciente.">
          {entradasReal ? (
            <>
              <MultiBarChart
                data={saidasPorSemana}
                bars={[
                  { key: "encerramento", label: "Encerramento gestação", color: "#6366f1" },
                  { key: "expiracao", label: "Expiração de janela", color: "#f59e0b" },
                  { key: "desaparecimento", label: "Desaparecimento", color: "#ef4444" },
                ]}
                stacked
                height={220}
              />
              <p className="text-xs text-gray-400 mt-2">Exibindo segmento Gestação.</p>
            </>
          ) : (
            <ApiErrorCard />
          )}
        </Card>
      </div>

      {/* Gestações e cadastro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Monitoramento de gestações (RF-10)" tooltip="Anomalias nos registros de gestação: datas nulas ou no futuro, e pacientes com mais de uma gestação ativa ao mesmo tempo.">
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

        <Card title="Qualidade do cadastro Vitacare (RF-11)" tooltip="Validade dos dados cadastrais dos pacientes: CPF com formato inválido, datas de nascimento incorretas e falta de vínculo com a população-alvo.">
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
    </div>
  );
}
