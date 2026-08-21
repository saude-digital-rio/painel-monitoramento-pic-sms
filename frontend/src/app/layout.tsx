import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PIC-SMS Monitor | Qualidade de Dados",
  description: "Painel de Diagnóstico e Qualidade de Dados – Dimensão Saúde",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" precedence="default" />
<div className="flex h-full min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="px-8 py-7 max-w-[1400px]">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
