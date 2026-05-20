import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatarBRL } from "@/lib/peso-mp";
import type { MotoristaMpAgg } from "@/hooks/useMotoristasMp";

interface Props {
  motorista: MotoristaMpAgg | null;
  onClose: () => void;
}

export function MotoristaMpDetalheDrawer({ motorista, onClose }: Props) {
  return (
    <Sheet open={!!motorista} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        {motorista && (
          <>
            <SheetHeader>
              <SheetTitle>{motorista.nome}</SheetTitle>
              <SheetDescription>
                {motorista.cpf ?? "—"} · {motorista.telefone ?? "—"}
              </SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <Card><CardContent className="p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Entregas</div>
                <div className="text-xl font-bold tabular-nums">{motorista.totalEntregas}</div>
              </CardContent></Card>
              <Card><CardContent className="p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Total ton</div>
                <div className="text-xl font-bold tabular-nums">{motorista.totalTon.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}</div>
              </CardContent></Card>
              <Card><CardContent className="p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Valor</div>
                <div className="text-base font-bold tabular-nums">{formatarBRL(motorista.totalValor)}</div>
              </CardContent></Card>
            </div>

            <div className="mt-4 space-y-2">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Placas usadas</div>
                <div className="flex flex-wrap gap-1">
                  {motorista.placas.map((p) => <Badge key={p} variant="outline" className="font-mono">{p}</Badge>)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Fornecedores atendidos</div>
                <div className="flex flex-wrap gap-1">
                  {motorista.fornecedores.map((f) => <Badge key={f} variant="secondary">{f}</Badge>)}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold mb-2">Histórico de descargas</div>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Ton</TableHead><TableHead className="text-right">R$</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {motorista.recebimentos.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{r.data_chegada.split("-").reverse().join("/")}</TableCell>
                        <TableCell className="font-mono text-xs">{r.placa ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.fornecedor_nome ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{Number(r.peso_total_ton).toLocaleString("pt-BR", { minimumFractionDigits: 3 })}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{formatarBRL(Number(r.valor_total))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}