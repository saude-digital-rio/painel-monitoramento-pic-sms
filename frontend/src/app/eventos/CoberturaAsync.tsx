import { Card } from "@/components/ui/Card";
import { ApiErrorCard } from "@/components/ui/ApiErrorCard";
import { api } from "@/lib/api/client";
import { AlertTriangle } from "lucide-react";

export async function CoberturaAsync() {
  const coberturaReal = await api.eventos.cobertura();
  const cobertura = coberturaReal
    ? {
        gestacao: coberturaReal.find((c) => c.segmento === "Gestacao"),
        puerperio: coberturaReal.find((c) => c.segmento === "Puerperio"),
        infancia: coberturaReal.find((c) => c.segmento === "Infancia"),
      }
    : null;

  return (
    <Card title="Cobertura de eventos por segmento" className="mb-6" tooltip="Percentual da população-alvo com ao menos um evento registrado (consulta, visita ou teste). Meta recomendada: ≥ 85%.">
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
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${seg.data.cobertura_pct}%` }} />
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
  );
}
