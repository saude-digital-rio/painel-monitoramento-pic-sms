"use client";

import { ReactNode } from "react";

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group ml-1.5 inline-flex items-center">
      <span className="w-3.5 h-3.5 rounded-full border border-gray-400 text-gray-400 text-[9px] font-bold flex items-center justify-center cursor-default select-none leading-none">
        i
      </span>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 rounded-lg bg-gray-900 text-white text-xs leading-relaxed px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg whitespace-normal">
        {text}
        <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

interface CardProps {
  contentClassName?: string;
  title?: string;
  subtitle?: string;
  tooltip?: string;
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ title, subtitle, tooltip, children, className = "", padding = true, contentClassName = "" }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {(title || subtitle) && (
        <div className="px-5 py-4 border-b border-gray-100">
          {title && (
            <h3 className="text-sm font-semibold text-gray-800 flex items-center">
              {title}
              {tooltip && <InfoTooltip text={tooltip} />}
            </h3>
          )}
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className={`${padding ? "p-5" : ""} ${contentClassName}`}>{children}</div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  icon?: ReactNode;
  color?: "blue" | "green" | "purple" | "orange" | "red";
}

const colorMap = {
  blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500" },
  green: { bg: "bg-green-50", text: "text-green-700", icon: "text-green-500" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", icon: "text-purple-500" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", icon: "text-orange-500" },
  red: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-500" },
};

export function StatCard({ label, value, sub, trend, icon, color = "blue" }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${c.text}`}>{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          {trend !== undefined && (
            <p className={`text-xs mt-1 font-medium ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}% vs ontem
            </p>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0 ml-3`}>
            <span className={c.icon}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
