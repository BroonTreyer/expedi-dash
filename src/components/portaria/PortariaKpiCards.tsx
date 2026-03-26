import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownToLine, ArrowUpFromLine, ParkingCircle, Truck } from "lucide-react";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
  isLoading?: boolean;
  dateLabel?: string;
}

export function PortariaKpiCards({ movimentacoes = [], isLoading, dateLabel }: Props) {
  const stats = useMemo(() => {
    const entradas = movimentacoes.filter((m) => m.tipo_movimento === "entrada");
    const saidas = movimentacoes.filter((m) => m.tipo_movimento === "saida");

    const terceirizados = entradas.filter((m) => m.categoria === "terceirizado").length;
    const entradasSemTerc = entradas.filter((m) => m.categoria !== "terceirizado");
    const saidasVinculadas = new Set(
      saidas.filter((m) => m.movimento_vinculado_id).map((m) => m.movimento_vinculado_id!)
    );
    const noPatio = entradasSemTerc.filter((e) => !saidasVinculadas.has(e.id)).length;

    return { entradas: entradas.length, saidas: saidas.length, noPatio, terceirizados };
  }, [movimentacoes]);

  const suffix = dateLabel || "Hoje";

  const cards = [
    { label: `Entradas ${suffix}`, value: stats.entradas, icon: ArrowDownToLine, color: "text-accent" },
    { label: `Retornos ${suffix}`, value: stats.saidas, icon: ArrowUpFromLine, color: "text-primary" },
    { label: "No Pátio", value: stats.noPatio, icon: ParkingCircle, color: "text-destructive" },
    ...(stats.terceirizados > 0 ? [{ label: `Terceirizados ${suffix}`, value: stats.terceirizados, icon: Truck, color: "text-blue-600 dark:text-blue-400" }] : []),
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}><CardContent className="p-3 sm:p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <c.icon className={`h-5 w-5 sm:h-7 sm:w-7 shrink-0 ${c.color}`} />
            <div className="min-w-0">
              <p className="text-base sm:text-xl font-bold tabular-nums truncate">{c.value}</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight truncate">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
