"use client";

import { useState } from "react";

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}

export function DonutChart({
  slices,
  size = 220,
  thickness = 40,
  centerLabel,
  centerSub,
}: DonutChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const total = slices.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = slices.map((s, i) => {
    const pct = total > 0 ? s.value / total : 0;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const seg = { ...s, dash, gap, offset, index: i };
    offset += dash;
    return seg;
  });

  const hoveredSlice = hovered !== null ? slices[hovered] : null;
  const hoveredPct = hoveredSlice && total > 0
    ? ((hoveredSlice.value / total) * 100).toFixed(1)
    : null;

  return (
    <div className="flex items-center justify-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={thickness} />
          ) : (
            segments.map((s) => (
              <circle
                key={s.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={hovered === s.index ? thickness + 6 : thickness}
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeDashoffset={-s.offset}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHovered(s.index)}
                onMouseLeave={() => setHovered(null)}
              />
            ))
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {hoveredSlice ? (
            <>
              <p className="text-lg font-bold leading-tight" style={{ color: hoveredSlice.color }}>{hoveredPct}%</p>
              <p className="text-xs text-gray-500 leading-tight px-2">{hoveredSlice.label}</p>
            </>
          ) : (
            <>
              {centerLabel && <p className="text-lg font-bold text-gray-800 leading-tight">{centerLabel}</p>}
              {centerSub && <p className="text-xs text-gray-400 leading-tight">{centerSub}</p>}
            </>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        {slices.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-center gap-2 text-sm transition-opacity duration-150 ${hovered !== null && hovered !== i ? "opacity-40" : ""}`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600">{s.label}</span>
            <span className="font-semibold text-gray-800">
              {total > 0 ? `${((s.value / total) * 100).toFixed(1)}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
