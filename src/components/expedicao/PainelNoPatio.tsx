import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParkingCircle, AlertTriangle } from "lucide-react";
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

function tempoClass(min: number) {
  if (min >= 480) return "text-destructive font-semibold";
  if (min >= 240) return "text-yellow-600 dark:text-yellow-400 font-medium";
  return "text-muted-foreground";
}

export function PainelNoPatio({ movimentacoes, now }: Props) {
  const lista = movimentacoes
    .filter(
      (m) =>
        m.categoria === "terceirizado" &&
        m.tipo_movimento === "entrada" &&
        m.horario_entrada &&
        m.etapa_terceirizado !== "finalizado"
    )
    .sort(
      (a, b) =>
        new Date(a.horario_entrada || a.data_hora).getTime() -
        new Date(b.horario_entrada || b.data_hora).getTime()
    );

  return (
    <Card className="border-emerald-500/30">
      <CardHeader className="py-3 px-4 bg-emerald-500/5 border-b">
        <CardTitle className="text-sm flex items-center gap-2">
          <ParkingCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          No Pátio
          <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            {lista.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {lista.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhum veículo no pátio</p>
        ) : (
          lista.map((m) => {
            const ref = new Date(m.horario_entrada || m.data_hora);
            const min = differenceInMinutes(now, ref);
            return (
              <div
                key={m.id}
                className={`rounded-md border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-2 ${
                  min >= 480 ? "border-destructive/40 bg-destructive/5" : min >= 240 ? "border-yellow-500/40 bg-yellow-500/5" : ""
                }`}
              >
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
                    {m.tipo_caminhao && <span>Tipo: {m.tipo_caminhao}</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
                    <span>Chegada: <strong className="text-foreground">{format(new Date(m.horario_chegada || m.data_hora), "HH:mm")}</strong></span>
                    {m.horario_entrada && <span>Entrada: <strong className="text-foreground">{format(new Date(m.horario_entrada), "HH:mm")}</strong></span>}
                  </div>
                </div>
                <div className={`text-xs sm:text-sm whitespace-nowrap ${tempoClass(min)}`}>
                  {min >= 480 && <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />}
                  no pátio há {formatTempo(min)}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
