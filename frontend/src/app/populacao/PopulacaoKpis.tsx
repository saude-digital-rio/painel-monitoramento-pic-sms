"use client";

import dynamic from "next/dynamic";
import { StatCard } from "@/components/ui/Card";
import { Users } from "lucide-react";
import type { PopulacaoAtualAPI } from "@/lib/api/client";

const PregnantWomanIcon = dynamic(() => import("@mui/icons-material/PregnantWoman"), { ssr: false });
const ChildFriendlyIcon = dynamic(() => import("@mui/icons-material/ChildFriendly"), { ssr: false });

interface Props {
  data: PopulacaoAtualAPI | null;
}

export function PopulacaoKpis({ data }: Props) {
  const pct = (n: number) =>
    data && data.total > 0
      ? `${((n / data.total) * 100).toFixed(1).replace(".", ",")}% do total`
      : undefined;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Total"
        value={data?.total ?? "—"}
        sub={data?.data_referencia ? `Ref. ${new Date(data.data_referencia).toLocaleDateString("pt-BR")}` : undefined}
        icon={<Users className="w-5 h-5" />}
        color="blue"
      />
      <StatCard
        label="Gestação"
        value={data?.gestacao ?? "—"}
        sub={pct(data?.gestacao ?? 0)}
        icon={<PregnantWomanIcon sx={{ fontSize: 20 }} />}
        color="purple"
      />
      <StatCard
        label="Puerpério"
        value={data?.puerperio ?? "—"}
        sub={pct(data?.puerperio ?? 0)}
        icon={<ChildFriendlyIcon sx={{ fontSize: 20 }} />}
        color="orange"
      />
      <StatCard
        label="Infância"
        value={data?.infancia ?? "—"}
        sub={pct(data?.infancia ?? 0)}
        icon={<span className="material-symbols-outlined" style={{ fontSize: 20 }}>child_care</span>}
        color="green"
      />
    </div>
  );
}
