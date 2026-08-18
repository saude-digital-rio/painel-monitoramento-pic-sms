"use client";

import { useState } from "react";
import { AlertTriangle, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface Row {
  tipo_evento: string;
  tipo_publico: string;
  count: number;
  compativel: boolean;
}

type Col = "tipo_evento" | "tipo_publico" | "count" | "compativel";
type Dir = "asc" | "desc";

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: Dir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-gray-400 inline ml-1" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 text-blue-500 inline ml-1" />
    : <ChevronDown className="w-3 h-3 text-blue-500 inline ml-1" />;
}

export function EventoSegmentoTable({ rows }: { rows: Row[] }) {
  const [sortCol, setSortCol] = useState<Col>("compativel");
  const [sortDir, setSortDir] = useState<Dir>("asc");

  function handleSort(col: Col) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "count" ? "desc" : "asc");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortCol === "tipo_evento") cmp = a.tipo_evento.localeCompare(b.tipo_evento, "pt-BR");
    else if (sortCol === "tipo_publico") cmp = a.tipo_publico.localeCompare(b.tipo_publico, "pt-BR");
    else if (sortCol === "count") cmp = a.count - b.count;
    else if (sortCol === "compativel") cmp = Number(a.compativel) - Number(b.compativel);
    return sortDir === "asc" ? cmp : -cmp;
  });

  function Th({ col, label, align = "left" }: { col: Col; label: string; align?: "left" | "right" | "center" }) {
    const active = sortCol === col;
    return (
      <th
        className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-800 transition-colors text-${align}`}
        onClick={() => handleSort(col)}
      >
        {label}
        <SortIcon col={col} active={active} dir={sortDir} />
      </th>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <Th col="tipo_evento" label="Tipo de evento" />
            <Th col="tipo_publico" label="Segmento" />
            <Th col="count" label="Volume" align="right" />
            <Th col="compativel" label="Status" align="center" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((row, i) => (
            <tr key={i} className={!row.compativel ? "bg-red-50" : undefined}>
              <td className="px-4 py-2.5 text-gray-800">{row.tipo_evento}</td>
              <td className="px-4 py-2.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  row.tipo_publico === "Gestacao" ? "bg-purple-100 text-purple-700" :
                  row.tipo_publico === "Puerperio" ? "bg-pink-100 text-pink-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {row.tipo_publico}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right font-mono font-medium text-gray-700">
                {row.count.toLocaleString("pt-BR")}
              </td>
              <td className="px-4 py-2.5 text-center">
                {row.compativel ? (
                  <span className="text-green-600 text-xs font-medium">✓ Compatível</span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 rounded-full text-red-700 text-xs font-medium">
                    <AlertTriangle className="w-3 h-3" /> Improvável
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
