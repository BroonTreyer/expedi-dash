import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Lock, Unlock, Loader2, Download, FileText } from "lucide-react";
import { useMpFechamentoMensal, useFecharMes, useReabrirMes } from "@/hooks/useMpFechamentoMensal";
import { fmtBRL, fmtTon, exportarXLSX } from "@/lib/mp-export";

function currentMonthISO() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }

export default function FechamentoMensalPage() {
  const [mes, setMes] = useState(currentMonthISO());
  const { data, isLoading } = useMpFechamentoMensal(mes);
  const fechar = useFecharMes();
  const reabrir = useReabrirMes();

  function exportar() {
    if (!data) return;
    const rows = data.fornecedores.map((f) => ({
      Fornecedor: f.fornecedor_nome,
      Recebimentos: f.qtd_recebimentos,
      "Peso (ton)": Number(f.ton.toFixed(3)),
      "Valor total": Number(f.valor.toFixed(2)),
      "Valor pago": Number(f.valor_pago.toFixed(2)),
      "Valor pendente": Number(f.valor_pendente.toFixed(2)),
      Status: f.valor_pendente > 0 ? "Pendente" : "Pago",
    }));
    exportarXLSX(`fechamento_mp_${mes.slice(0, 7)}.xlsx`, { Fechamento: rows });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Mês de referência</Label>
          <Input type="month" value={mes.slice(0, 7)} onChange={(e) => setMes(e.target.value + "-01")} className="h-9 w-44" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportar} disabled={!data?.fornecedores.length}>
            <Download className="h-4 w-4 mr-2" /> Exportar XLSX
          </Button>
          {data?.totals.fechado ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Unlock className="h-4 w-4 mr-2" /> Reabrir mês
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reabrir o mês?</AlertDialogTitle>
                  <AlertDialogDescription>Os recebimentos voltam a ser editáveis.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => reabrir.mutate(mes)}>Reabrir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={!data?.totals.qtd}>
                  <Lock className="h-4 w-4 mr-2" /> Fechar mês
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Fechar o mês?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Após fechado, os recebimentos deste mês ficam bloqueados para edição. Você pode reabrir depois se necessário.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => fechar.mutate(mes)}>Fechar mês</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="py-16 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi label="Recebimentos" value={data.totals.qtd} />
            <Kpi label="Toneladas" value={fmtTon(data.totals.ton)} />
            <Kpi label="Valor total" value={fmtBRL(data.totals.valor)} />
            <Kpi label="Pago" value={fmtBRL(data.totals.pago)} tone="ok" />
            <Kpi label="Pendente" value={fmtBRL(data.totals.pendente)} tone={data.totals.pendente > 0 ? "warn" : undefined} />
          </div>

          {data.totals.fechado && (
            <div className="flex items-center gap-2 text-xs p-2 rounded-md border bg-muted/30">
              <Lock className="h-3.5 w-3.5" />
              Mês fechado · todos os recebimentos estão bloqueados para edição.
            </div>
          )}

          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Recebimentos</TableHead>
                  <TableHead className="text-right">Ton</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Pendente</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.fornecedores.map((f) => (
                  <TableRow key={f.fornecedor_id ?? f.fornecedor_nome}>
                    <TableCell className="font-medium">{f.fornecedor_nome}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.qtd_recebimentos}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtTon(f.ton)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(f.valor)}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">{fmtBRL(f.valor_pago)}</TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600">{fmtBRL(f.valor_pendente)}</TableCell>
                    <TableCell>
                      {f.valor_pendente > 0
                        ? <Badge variant="outline" className="text-amber-700 border-amber-300">Pendente</Badge>
                        : <Badge variant="default">Pago</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
                {data.fornecedores.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sem recebimentos no mês.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: any; tone?: "ok" | "warn" }) {
  const cls = tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "";
  return (
    <Card><CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold tabular-nums mt-1 ${cls}`}>{value}</div>
    </CardContent></Card>
  );
}