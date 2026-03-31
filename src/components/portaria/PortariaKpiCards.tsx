import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownToLine, ArrowUpFromLine, ParkingCircle, Truck, Clock } from "lucide-react";
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

    const saidasVinculadas = new Set(
      saidas.filter((m) => m.movimento_vinculado_id).map((m) => m.movimento_vinculado_id!)
    );
    
    // Terceirizados aguardando (arrived but not yet entered)
    const tercAguardando = entradas.filter((m) => m.categoria === "terceirizado" && m.etapa_terceirizado === "aguardando").length;
    
    // All vehicles in yard (non-terceirizados without exit + terceirizados with etapa no_patio)
    const noPatio = entradas.filter((e) => {
      if (e.categoria === "terceirizado") {
        return e.etapa_terceirizado === "no_patio";
      }
      return !saidasVinculadas.has(e.id);
    }).length;

    return { entradas: entradas.length, saidas: saidas.length, noPatio, tercAguardando };
  }, [movimentacoes]);

  const suffix = dateLabel || "Hoje";

  const cards = [
    { label: `Entradas ${suffix}`, value: stats.entradas, icon: ArrowDownToLine, color: "text-accent" },
    { label: `Saídas ${suffix}`, value: stats.saidas, icon: ArrowUpFromLine, color: "text-primary" },
    { label: "No Pátio", value: stats.noPatio, icon: ParkingCircle, color: "text-destructive" },
    ...(stats.tercAguardando > 0 ? [{ label: "Aguardando Entrada", value: stats.tercAguardando, icon: Clock, color: "text-yellow-600 dark:text-yellow-400" }] : []),
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-3 sm:p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-2 sm:gap-3 ${cards.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
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
