import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock3, CalendarClock, Weight } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { VeiculoEsperado } from "@/hooks/useVeiculosEsperados";

interface Props {
  veiculos: VeiculoEsperado[];
  hoje: string;
}

const fmtKg = (n: number | null | undefined) =>
  n != null ? `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg` : null;

export function PainelAChegar({ veiculos, hoje }: Props) {
  const lista = veiculos
    .filter((v) => !v.conferido)
    .sort((a, b) => (a.data_referencia || "").localeCompare(b.data_referencia || ""));

  return (
    <Card className="overflow-hidden border-sky-600/40 shadow-md">
      <CardHeader className="py-3 px-4 bg-sky-600 text-white">
        <CardTitle className="text-base flex items-center gap-2 font-bold">
          <Clock3 className="h-5 w-5" />
          A chegar
          <Badge className="ml-auto bg-white text-sky-700 hover:bg-white text-sm font-bold px-2.5">
            {lista.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum veículo previsto</p>
        ) : (
          lista.map((v, idx) => {
            const atrasado = v.data_referencia < hoje;
            const futuro = v.data_referencia > hoje;
            const kg = fmtKg(v.peso);
            const borderL = atrasado ? "border-l-red-600" : futuro ? "border-l-amber-500" : "border-l-sky-600";
            return (
              <div
                key={v.id}
                className={`rounded-md border border-l-4 ${borderL} ${idx % 2 === 0 ? "bg-background" : "bg-muted/40"} p-3 flex flex-col sm:flex-row sm:items-center gap-2`}
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-extrabold text-base sm:text-lg">{v.placa}</span>
                    {v.carga_id && (
                      <Badge variant="secondary" className="text-xs h-6 font-mono">{v.carga_id}</Badge>
                    )}
                    {kg && (
                      <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 dark:bg-sky-900 dark:text-sky-200 text-xs h-6 gap-1">
                        <Weight className="h-3 w-3" /> {kg}
                      </Badge>
                    )}
                    {atrasado && (
                      <Badge className="bg-red-600 text-white hover:bg-red-600 text-xs h-6 gap-0.5">
                        <CalendarClock className="h-3 w-3" /> Atrasado {format(parseISO(v.data_referencia), "dd/MM")}
                      </Badge>
                    )}
                    {futuro && (
                      <Badge className="bg-amber-500 text-black hover:bg-amber-500 text-xs h-6 gap-0.5">
                        <CalendarClock className="h-3 w-3" /> Saída {format(parseISO(v.data_referencia), "dd/MM")}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    {v.motorista && <span>Motorista: <span className="text-foreground font-medium">{v.motorista}</span></span>}
                    {v.transportadora && <span>Transp.: <span className="text-foreground font-medium">{v.transportadora}</span></span>}
                    {v.destino && <span>Rota: <span className="text-foreground">{v.destino}</span></span>}
                  </div>
                  {v.qtd_entregas != null && (
                    <div className="text-xs text-muted-foreground">
                      Entregas: <strong className="text-foreground">{v.qtd_entregas}</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
