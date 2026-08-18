"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

interface BarConfig {
  key: string;
  label: string;
  color: string;
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  bars: BarConfig[];
  xKey?: string;
  height?: number;
  stacked?: boolean;
  formatY?: (v: number) => string;
  formatX?: (v: string) => string;
}

function defaultFormatX(v: string) {
  const d = new Date(v + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function defaultFormatY(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

export function MultiBarChart({
  data,
  bars,
  xKey = "data",
  height = 260,
  stacked = false,
  formatY = defaultFormatY,
  formatX = defaultFormatX,
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={formatX}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatY}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          labelFormatter={(v) => formatX(String(v))}
          formatter={(v: unknown) => [typeof v === "number" ? v.toLocaleString("pt-BR") : String(v), ""]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {bars.map(({ key, label, color }) => (
          <Bar
            key={key}
            dataKey={key}
            name={label}
            fill={color}
            stackId={stacked ? "a" : undefined}
            radius={stacked ? undefined : [2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface SimpleBarProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}

export function SimpleBarChart({ data, height = 200 }: SimpleBarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis
          dataKey="label"
          type="category"
          width={140}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          formatter={(v: unknown) => [typeof v === "number" ? v.toLocaleString("pt-BR") : String(v), ""]}
        />
        <Bar dataKey="value" radius={[0, 3, 3, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? "#3b82f6"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
