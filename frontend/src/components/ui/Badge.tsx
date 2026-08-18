"use client";

import type { Severidade } from "@/lib/api/client";

const styles: Record<Severidade, string> = {
  critico: "bg-red-100 text-red-800 border border-red-200",
  alerta: "bg-orange-100 text-orange-800 border border-orange-200",
  aviso: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  ok: "bg-green-100 text-green-800 border border-green-200",
};

const labels: Record<Severidade, string> = {
  critico: "Crítico",
  alerta: "Alerta",
  aviso: "Aviso",
  ok: "OK",
};

const dots: Record<Severidade, string> = {
  critico: "bg-red-500",
  alerta: "bg-orange-500",
  aviso: "bg-yellow-400",
  ok: "bg-green-500",
};

export function SeveridadeBadge({ severidade }: { severidade: Severidade }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${styles[severidade]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[severidade]}`} />
      {labels[severidade]}
    </span>
  );
}

export function StatusDot({ severidade, size = "md" }: { severidade: Severidade; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-2 h-2", md: "w-3 h-3", lg: "w-4 h-4" };
  return <span className={`inline-block rounded-full ${dots[severidade]} ${sizes[size]} shrink-0`} />;
}
