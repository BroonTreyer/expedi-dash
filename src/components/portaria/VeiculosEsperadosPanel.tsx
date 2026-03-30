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
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Veículos Esperados
            <Badge variant="secondary" className="text-[10px] h-5">
              {totalConferidos}/{veiculos.length} conferidos
            </Badge>
            {pendentes > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 border-amber-300 text-amber-700 dark:text-amber-400">
                {pendentes} pendentes
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={onClear}>
            <X className="h-3 w-3" /> Limpar lista
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[250px]">
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
