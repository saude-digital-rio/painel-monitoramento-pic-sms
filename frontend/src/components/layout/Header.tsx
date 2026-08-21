"use client";

import { ReactNode } from "react";
import { Clock } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  dataRef?: string;
}

export function Header({ title, subtitle, actions, dataRef }: HeaderProps) {
  return (
    <div className="flex items-start justify-between pb-5 border-b border-gray-200 mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        {dataRef && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span suppressHydrationWarning>Referência: {new Date(dataRef).toLocaleString("pt-BR")}</span>
          </div>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 ml-4">{actions}</div>}
    </div>
  );
}
