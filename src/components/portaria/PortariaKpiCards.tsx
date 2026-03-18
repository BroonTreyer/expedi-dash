import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownToLine, ArrowUpFromLine, ParkingCircle, Activity, Timer } from "lucide-react";
import { differenceInMinutes } from "date-fns";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
  isLoading?: boolean;
}

function formatTempoMedio(minutos: number): string {
  if (minutos === 0) return "—";
  if (minutos < 60) return `${Math.round(minutos)}min`;
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  return `${h}h ${m.toString().padStart(2, "0")}`;
}

export function PortariaKpiCards({ movimentacoes = [], isLoading }: Props) {
  const stats = useMemo(() => {
    const entradas = movimentacoes.filter((m) => m.tipo_movimento === "entrada");
    const saidas = movimentacoes.filter((m) => m.tipo_movimento === "saida");

    const saidasVinculadas = new Set(
      saidas.filter((m) => m.movimento_vinculado_id).map((m) => m.movimento_vinculado_id!)
    );
    const noPatio = entradas.filter((e) => !saidasVinculadas.has(e.id)).length;

    // Tempo médio: apenas veículos que já saíram
    let tempoMedio = 0;
    const saidasMap = new Map<string, MovimentacaoPortaria>();
    saidas.forEach((s) => { if (s.movimento_vinculado_id) saidasMap.set(s.movimento_vinculado_id, s); });

    const tempos: number[] = [];
    entradas.forEach((e) => {
      const saida = saidasMap.get(e.id);
      if (saida) {
        tempos.push(differenceInMinutes(new Date(saida.data_hora), new Date(e.data_hora)));
      }
    });
    if (tempos.length > 0) tempoMedio = tempos.reduce((a, b) => a + b, 0) / tempos.length;

    return {
      entradas: entradas.length,
      saidas: saidas.length,
      noPatio,
      total: movimentacoes.length,
      tempoMedio,
    };
  }, [movimentacoes]);

  const cards = [
    { label: "Entradas Hoje", value: stats.entradas, icon: ArrowDownToLine, color: "text-accent" },
    { label: "Saídas Hoje", value: stats.saidas, icon: ArrowUpFromLine, color: "text-primary" },
    { label: "Veículos no Pátio", value: stats.noPatio, icon: ParkingCircle, color: "text-destructive" },
    { label: "Tempo Médio", value: formatTempoMedio(stats.tempoMedio), icon: Timer, color: "text-muted-foreground", isText: true },
    { label: "Total Movimentos", value: stats.total, icon: Activity, color: "text-muted-foreground" },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <c.icon className={`h-7 w-7 shrink-0 ${c.color}`} />
            <div>
              <p className="text-xl font-bold tabular-nums">{c.value}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
