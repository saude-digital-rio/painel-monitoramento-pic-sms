"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  Users,
  Activity,
  MapPin,
  Bell,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/visao-geral", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/fontes", label: "Fontes e Atualização", icon: Database },
  { href: "/populacao", label: "População-alvo", icon: Users },
  { href: "/eventos", label: "Eventos", icon: Activity },
  { href: "/unidades", label: "Unidades", icon: MapPin },
  { href: "/alertas", label: "Alertas", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 shrink-0 bg-gray-900 text-gray-200 flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">P</div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">PIC-SMS Monitor</p>
            <p className="text-xs text-gray-400">Qualidade de Dados</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
                active
                  ? "bg-blue-700 text-white font-medium"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-gray-700 text-xs text-gray-500">
        <p suppressHydrationWarning>PIC-SMS · {new Date().toLocaleDateString("pt-BR")}</p>
        <p className="mt-0.5">Dados em tempo real — BigQuery</p>
      </div>
    </aside>
  );
}
