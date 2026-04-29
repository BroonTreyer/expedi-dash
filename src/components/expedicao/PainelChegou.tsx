import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BellRing, Hourglass } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
  now: Date;
}

function formatTempo(min: number) {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

export function PainelChegou({ movimentacoes, now }: Props) {
  const lista = movimentacoes
    .filter(
      (m) =>
        m.categoria === "terceirizado" &&
        m.tipo_movimento === "entrada" &&
        !m.horario_entrada &&
        (m.etapa_terceirizado === "chegada" || !!m.horario_chegada)
    )
    .sort(
      (a, b) =>
        new Date(a.horario_chegada || a.data_hora).getTime() -
        new Date(b.horario_chegada || b.data_hora).getTime()
    );

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="py-3 px-4 bg-amber-500/5 border-b">
        <CardTitle className="text-sm flex items-center gap-2">
          <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Chegou — aguardando liberação
          <Badge variant="outline" className="text-[10px] h-5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
            {lista.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {lista.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Ninguém aguardando entrada</p>
        ) : (
          lista.map((m) => {
            const ref = new Date(m.horario_chegada || m.data_hora);
            const min = differenceInMinutes(now, ref);
            return (
              <div key={m.id} className="rounded-md border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm">{m.placa || "—"}</span>
                    {m.carga_id && (
                      <Badge variant="secondary" className="text-[10px] h-5 font-mono">{m.carga_id}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    {m.motorista && <span>Motorista: <span className="text-foreground">{m.motorista}</span></span>}
                    {m.empresa && <span>Transp.: <span className="text-foreground">{m.empresa}</span></span>}
                  </div>
                </div>
                <div className="text-xs whitespace-nowrap text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                  <Hourglass className="h-3.5 w-3.5" />
                  Chegou {format(ref, "HH:mm")} · {formatTempo(min)}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
