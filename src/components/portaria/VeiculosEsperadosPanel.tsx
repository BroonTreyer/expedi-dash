import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ClipboardCheck, Truck, X, CheckCircle2, CalendarClock } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { VeiculoEsperado } from "@/hooks/useVeiculosEsperados";

interface Props {
  veiculos: VeiculoEsperado[];
  onRegistrar: (veiculo: VeiculoEsperado) => void;
  onClear: () => void;
  isClearing?: boolean;
  dataFiltrada?: string; // yyyy-MM-dd
  readOnly?: boolean;
}

function isDataFutura(dataRef: string, dataFiltrada?: string): boolean {
  if (!dataFiltrada) return false;
  return dataRef > dataFiltrada;
}

function isDataPassada(dataRef: string, dataFiltrada?: string): boolean {
  if (!dataFiltrada) return false;
  return dataRef < dataFiltrada;
}

function DataPrevistaBadge({ dataRef }: { dataRef: string }) {
  return (
    <Badge variant="outline" className="text-[10px] h-5 border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 gap-0.5">
      <CalendarClock className="h-3 w-3" />
      Saída {format(parseISO(dataRef), "dd/MM")}
    </Badge>
  );
}

function DataAtrasadaBadge({ dataRef }: { dataRef: string }) {
  return (
    <Badge variant="outline" className="text-[10px] h-5 border-destructive bg-destructive/10 text-destructive gap-0.5">
      <CalendarClock className="h-3 w-3" />
      Atrasado {format(parseISO(dataRef), "dd/MM")}
    </Badge>
  );
}

export function VeiculosEsperadosPanel({ veiculos, onRegistrar, onClear, isClearing, dataFiltrada, readOnly }: Props) {
  if (veiculos.length === 0) return null;

  const totalConferidos = veiculos.filter((v) => v.conferido).length;
  const pendentes = veiculos.length - totalConferidos;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="py-3 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary shrink-0" />
              Veículos Esperados
            </CardTitle>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[10px] h-5">
                {totalConferidos}/{veiculos.length} conferidos
              </Badge>
              {pendentes > 0 && (
                <Badge variant="outline" className="text-[10px] h-5 border-amber-300 text-amber-700 dark:text-amber-400">
                  {pendentes} pendentes
                </Badge>
              )}
            </div>
          </div>
          {!readOnly && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground self-end sm:self-auto" onClick={onClear} disabled={isClearing}>
              <X className="h-3 w-3" /> Limpar lista
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile: Cards */}
        <div className="md:hidden overflow-auto max-h-[300px] space-y-2 p-3">
          {veiculos.map((v) => {
            const isConferido = v.conferido;
            const isFuturo = isDataFutura(v.data_referencia, dataFiltrada);
            const isPassado = isDataPassada(v.data_referencia, dataFiltrada);
            return (
              <div
                key={v.id}
                className={`rounded-lg border bg-card p-3 space-y-2 ${isConferido ? "opacity-50" : ""} ${isFuturo && !isConferido ? "border-amber-300 dark:border-amber-700" : ""} ${isPassado && !isConferido ? "border-destructive/50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isConferido ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={`font-mono font-bold text-sm ${isConferido ? "line-through" : ""}`}>
                      {v.placa}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {isFuturo && !isConferido && <DataPrevistaBadge dataRef={v.data_referencia} />}
                    {isPassado && !isConferido && <DataAtrasadaBadge dataRef={v.data_referencia} />}
                    <Badge
                      variant={isConferido ? "secondary" : "outline"}
                      className={`text-[10px] h-5 ${!isConferido ? "border-amber-300 text-amber-700 dark:text-amber-400" : ""}`}
                    >
                      {isConferido ? "Conferido" : "Pendente"}
                    </Badge>
                  </div>
                </div>
                <div className={`text-xs ${isConferido ? "line-through" : ""}`}>
                  <span className="text-muted-foreground">Motorista:</span> {v.motorista || "—"}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div><span className="text-muted-foreground">Rota:</span> {v.destino || "—"}</div>
                  <div><span className="text-muted-foreground">Carga:</span> {v.carga_id || "—"}</div>
                  <div><span className="text-muted-foreground">Peso:</span> {v.peso ?? "—"}</div>
                  <div><span className="text-muted-foreground">Entregas:</span> {v.qtd_entregas ?? "—"}</div>
                </div>
                {!isConferido && !readOnly && (
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1" onClick={() => onRegistrar(v)}>
                    Registrar Entrada
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop: Table */}
        <div className="hidden md:block overflow-auto max-h-[250px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] w-[60px]">Status</TableHead>
                <TableHead className="text-[11px]">Placa</TableHead>
                <TableHead className="text-[11px]">Motorista</TableHead>
                <TableHead className="text-[11px]">Rota</TableHead>
                <TableHead className="text-[11px]">N° Carga</TableHead>
                <TableHead className="text-[11px] text-right">Peso</TableHead>
                <TableHead className="text-[11px] text-right">Entregas</TableHead>
                <TableHead className="text-[11px] w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {veiculos.map((v) => {
                const isConferido = v.conferido;
                const isFuturo = isDataFutura(v.data_referencia, dataFiltrada);
                return (
                  <TableRow key={v.id} className={`${isConferido ? "opacity-50" : ""} ${isFuturo && !isConferido ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}>
                    <TableCell className="py-1.5">
                      {isConferido ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Truck className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className={`text-xs font-mono font-medium py-1.5 ${isConferido ? "line-through" : ""}`}>
                      <div className="flex items-center gap-1.5">
                        {v.placa}
                        {isFuturo && !isConferido && <DataPrevistaBadge dataRef={v.data_referencia} />}
                      </div>
                    </TableCell>
                    <TableCell className={`text-xs py-1.5 ${isConferido ? "line-through" : ""}`}>
                      {v.motorista || "—"}
                    </TableCell>
                    <TableCell className="text-xs py-1.5">{v.destino || "—"}</TableCell>
                    <TableCell className="text-xs py-1.5">{v.carga_id || "—"}</TableCell>
                    <TableCell className="text-xs py-1.5 text-right">{v.peso ?? "—"}</TableCell>
                    <TableCell className="text-xs py-1.5 text-right">{v.qtd_entregas ?? "—"}</TableCell>
                    <TableCell className="py-1.5">
                      {!isConferido && !readOnly && (
                        <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => onRegistrar(v)}>
                          Registrar Entrada
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
