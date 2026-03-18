import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownToLine, ArrowUpFromLine, ParkingCircle, Activity } from "lucide-react";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
}

export function PortariaKpiCards({ movimentacoes = [] }: Props) {
  const entradas = movimentacoes.filter((m) => m.tipo_movimento === "entrada").length;
  const saidas = movimentacoes.filter((m) => m.tipo_movimento === "saida").length;

  // Veículos no pátio: entradas sem saída vinculada
  const entradasIds = new Set(
    movimentacoes.filter((m) => m.tipo_movimento === "entrada").map((m) => m.id)
  );
  const saidasVinculadas = new Set(
    movimentacoes
      .filter((m) => m.tipo_movimento === "saida" && m.movimento_vinculado_id)
      .map((m) => m.movimento_vinculado_id!)
  );
  const noPatio = [...entradasIds].filter((id) => !saidasVinculadas.has(id)).length;

  const total = movimentacoes.length;

  const cards = [
    { label: "Entradas Hoje", value: entradas, icon: ArrowDownToLine, color: "text-accent" },
    { label: "Saídas Hoje", value: saidas, icon: ArrowUpFromLine, color: "text-primary" },
    { label: "Veículos no Pátio", value: noPatio, icon: ParkingCircle, color: "text-destructive" },
    { label: "Total de Movimentos", value: total, icon: Activity, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <c.icon className={`h-8 w-8 shrink-0 ${c.color}`} />
            <div>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
