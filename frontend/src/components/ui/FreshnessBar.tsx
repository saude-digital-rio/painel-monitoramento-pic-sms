"use client";

import type { Severidade } from "@/lib/api/client";
import { StatusDot } from "./Badge";

interface FreshnessBarProps {
  horas: number;
  severidade: Severidade;
  ultimaAtualizacao: string;
}

export function FreshnessBar({ horas, severidade, ultimaAtualizacao }: FreshnessBarProps) {
  const label =
    horas < 24
      ? `Atualizado há ${horas}h`
      : horas < 48
      ? `Sem atualização há ${horas}h (>24h)`
      : horas < 72
      ? `Sem atualização há ${horas}h (>48h)`
      : `Sem atualização há ${horas}h (>72h)`;

  const dt = new Date(ultimaAtualizacao);
  const formatted = dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <StatusDot severidade={severidade} size="sm" />
      <span>{label}</span>
      <span className="text-gray-400">·</span>
      <span className="text-gray-400">{formatted}</span>
    </div>
  );
}
