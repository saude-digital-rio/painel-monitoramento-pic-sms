import { AlertCircle } from "lucide-react";

interface Props {
  mensagem?: string;
  altura?: string;
}

export function ApiErrorCard({ mensagem, altura = "h-40" }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center ${altura} gap-3 rounded-xl bg-red-50 border border-red-100 p-6`}>
      <AlertCircle className="w-8 h-8 text-red-300" />
      <div className="text-center">
        <p className="text-sm font-medium text-red-500">Dados indisponíveis</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {mensagem ?? "Não foi possível carregar os dados. Verifique se o backend está rodando."}
        </p>
      </div>
    </div>
  );
}
