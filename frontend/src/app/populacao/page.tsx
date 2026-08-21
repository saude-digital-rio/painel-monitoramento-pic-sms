import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { api } from "@/lib/api/client";
import { PopulacaoKpis } from "./PopulacaoKpis";
import { EntradasSemanaSection } from "./EntradasSemanaSection";
import { ConsistenciaAsync } from "./ConsistenciaAsync";
import { GestacaoQualidadeAsync } from "./GestacaoQualidadeAsync";
import { QualidadeCadastroAsync } from "./QualidadeCadastroAsync";
import { MovimentacaoInfanciaAsync } from "./MovimentacaoInfanciaAsync";
import { PerfilInfanciaAsync } from "./PerfilInfanciaAsync";

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default async function PopulacaoPage() {
  const [popReal, entradasReal] = await Promise.all([
    api.populacao.atual(),
    api.populacao.entradasSaidas(12),
  ]);

  return (
    <div>
      <Header
        title="População-alvo"
        subtitle="Volume por segmento, qualidade cadastral, janelas e anomalias"
        dataRef={popReal?.data_referencia ?? undefined}
      />

      <p className="text-xs text-gray-400 -mt-4 mb-6 leading-relaxed">
        Os números refletem os dados enviados pela SMS ao IPLAN para a consolidação do programa.
        Eles não correspondem à população final do PIC, que é definida após a aplicação de critérios
        socioeconômicos adicionais e a integração com dados de outras dimensões do RMI, como
        assistência social e educação.
      </p>

      <PopulacaoKpis data={popReal} />

      {/* Entradas por semana */}
      <div className="mb-6">
        <EntradasSemanaSection initialData={entradasReal} />
      </div>

      {/* Consistência da população-alvo | Gestação e puerpério */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Suspense fallback={<CardSkeleton />}>
          <ConsistenciaAsync />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <GestacaoQualidadeAsync />
        </Suspense>
      </div>

      {/* Movimentação da Infância | Perfil da população infantil */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Suspense fallback={<CardSkeleton />}>
          <MovimentacaoInfanciaAsync />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <PerfilInfanciaAsync />
        </Suspense>
      </div>

      {/* Qualidade do cadastro Vitacare */}
      <div className="mb-6">
        <Suspense fallback={<CardSkeleton />}>
          <QualidadeCadastroAsync />
        </Suspense>
      </div>
    </div>
  );
}
