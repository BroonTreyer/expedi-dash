import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownToLine, ArrowUpFromLine, ParkingCircle, Timer, Hourglass, Clock } from "lucide-react";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { computeTempos, formatDuracao, media } from "@/lib/portaria-tempos";

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

    // All vehicles in yard (non-terceirizados without exit + terceirizados with etapa no_patio)
    const noPatio = entradas.filter((e) => {
      if (saidasVinculadas.has(e.id)) return false;
      if (e.categoria === "terceirizado" && e.etapa_terceirizado === "finalizado") return false;
      return true;
    }).length;

    // Tempos médios — pareia entradas com suas saídas vinculadas
    const saidaPorEntradaId = new Map<string, MovimentacaoPortaria>();
    for (const sd of saidas) {
      if (sd.movimento_vinculado_id) saidaPorEntradaId.set(sd.movimento_vinculado_id, sd);
    }
    const tempos = movimentacoes
      .filter((m) => m.tipo_movimento === "entrada" || m.categoria === "carga_propria")
      .map((m) => computeTempos(m, saidaPorEntradaId.get(m.id)));
    const mediaEspera = media(tempos.map((t) => t.espera));
    const mediaOperacao = media(tempos.map((t) => t.operacao));
    const mediaTotal = media(tempos.map((t) => t.total));

    return { entradas: entradas.length, saidas: saidas.length, noPatio, mediaEspera, mediaOperacao, mediaTotal };
  }, [movimentacoes]);

  const suffix = dateLabel || "Hoje";

  const cards = [
    { label: `Entradas ${suffix}`, value: stats.entradas, icon: ArrowDownToLine, color: "text-accent" },
    { label: `Saídas ${suffix}`, value: stats.saidas, icon: ArrowUpFromLine, color: "text-primary" },
    { label: "No Pátio", value: stats.noPatio, icon: ParkingCircle, color: "text-destructive" },
  ];

  const tempoCards = [
    { label: "Espera média", value: formatDuracao(stats.mediaEspera), icon: Hourglass, color: "text-amber-500" },
    { label: "Operação média", value: formatDuracao(stats.mediaOperacao), icon: Timer, color: "text-primary" },
    { label: "Tempo total médio", value: formatDuracao(stats.mediaTotal), icon: Clock, color: "text-accent" },
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
    <div className="space-y-2 sm:space-y-3">
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
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {tempoCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <c.icon className={`h-5 w-5 sm:h-7 sm:w-7 shrink-0 ${c.color}`} />
              <div className="min-w-0">
                <p className="text-sm sm:text-lg font-bold tabular-nums truncate">{c.value}</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight truncate">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
