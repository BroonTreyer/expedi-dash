import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ClipboardCheck, Truck, X, CheckCircle2 } from "lucide-react";
import type { ParsedRow } from "./ImportarPlanilhaDialog";

interface Props {
  veiculos: ParsedRow[];
  conferidos: Set<string>;
  onRegistrar: (veiculo: ParsedRow) => void;
  onClear: () => void;
}

export function VeiculosEsperadosPanel({ veiculos, conferidos, onRegistrar, onClear }: Props) {
  if (veiculos.length === 0) return null;

  const totalConferidos = veiculos.filter((v) => conferidos.has(v.placa)).length;
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
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground self-end sm:self-auto" onClick={onClear}>
            <X className="h-3 w-3" /> Limpar lista
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile: Cards */}
        <div className="md:hidden overflow-auto max-h-[300px] space-y-2 p-3">
          {veiculos.map((v, i) => {
            const isConferido = conferidos.has(v.placa);
            return (
              <div
                key={i}
                className={`rounded-lg border bg-card p-3 space-y-2 ${isConferido ? "opacity-50" : ""}`}
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
                  <Badge
                    variant={isConferido ? "secondary" : "outline"}
                    className={`text-[10px] h-5 ${!isConferido ? "border-amber-300 text-amber-700 dark:text-amber-400" : ""}`}
                  >
                    {isConferido ? "Conferido" : "Pendente"}
                  </Badge>
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
                {!isConferido && (
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
              {veiculos.map((v, i) => {
                const isConferido = conferidos.has(v.placa);
                return (
                  <TableRow key={i} className={isConferido ? "opacity-50" : ""}>
                    <TableCell className="py-1.5">
                      {isConferido ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Truck className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className={`text-xs font-mono font-medium py-1.5 ${isConferido ? "line-through" : ""}`}>
                      {v.placa}
                    </TableCell>
                    <TableCell className={`text-xs py-1.5 ${isConferido ? "line-through" : ""}`}>
                      {v.motorista || "—"}
                    </TableCell>
                    <TableCell className="text-xs py-1.5">{v.destino || "—"}</TableCell>
                    <TableCell className="text-xs py-1.5">{v.carga_id || "—"}</TableCell>
                    <TableCell className="text-xs py-1.5 text-right">{v.peso ?? "—"}</TableCell>
                    <TableCell className="text-xs py-1.5 text-right">{v.qtd_entregas ?? "—"}</TableCell>
                    <TableCell className="py-1.5">
                      {!isConferido && (
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
