import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock3, CalendarClock } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { VeiculoEsperado } from "@/hooks/useVeiculosEsperados";

interface Props {
  veiculos: VeiculoEsperado[];
  hoje: string;
}

export function PainelAChegar({ veiculos, hoje }: Props) {
  const lista = veiculos
    .filter((v) => !v.conferido)
    .sort((a, b) => (a.data_referencia || "").localeCompare(b.data_referencia || ""));

  return (
    <Card className="border-sky-500/30">
      <CardHeader className="py-3 px-4 bg-sky-500/5 border-b">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          A chegar
          <Badge variant="outline" className="text-[10px] h-5 border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400">
            {lista.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {lista.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhum veículo previsto</p>
        ) : (
          lista.map((v) => {
            const atrasado = v.data_referencia < hoje;
            const futuro = v.data_referencia > hoje;
            return (
              <div
                key={v.id}
                className={`rounded-md border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-2 ${
                  atrasado ? "border-destructive/40 bg-destructive/5" : ""
                }`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm">{v.placa}</span>
                    {v.carga_id && (
                      <Badge variant="secondary" className="text-[10px] h-5 font-mono">{v.carga_id}</Badge>
                    )}
                    {atrasado && (
                      <Badge variant="outline" className="text-[10px] h-5 gap-0.5 border-destructive bg-destructive/10 text-destructive">
                        <CalendarClock className="h-3 w-3" /> Atrasado {format(parseISO(v.data_referencia), "dd/MM")}
                      </Badge>
                    )}
                    {futuro && (
                      <Badge variant="outline" className="text-[10px] h-5 gap-0.5 border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        <CalendarClock className="h-3 w-3" /> Saída {format(parseISO(v.data_referencia), "dd/MM")}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    {v.motorista && <span>Motorista: <span className="text-foreground">{v.motorista}</span></span>}
                    {v.transportadora && <span>Transp.: <span className="text-foreground">{v.transportadora}</span></span>}
                    {v.destino && <span>Rota: <span className="text-foreground">{v.destino}</span></span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
                    {v.peso != null && (
                      <span>Peso: <strong className="text-foreground">{Number(v.peso).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</strong></span>
                    )}
                    {v.qtd_entregas != null && <span>Entregas: <strong className="text-foreground">{v.qtd_entregas}</strong></span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
