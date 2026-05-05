import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useGastosVendedor } from "@/hooks/useGastosVendedor";
import { format, subDays } from "date-fns";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtKg = (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(n || 0);

export function GastosVendedorTab() {
  const [di, setDi] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [df, setDf] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data = [], isLoading } = useGastosVendedor(di, df);

  const totalFrete = data.reduce((s, r) => s + r.frete_rateado, 0);
  const totalPeso = data.reduce((s, r) => s + r.peso_kg, 0);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={di} onChange={(e) => setDi(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={df} onChange={(e) => setDf(e.target.value)} className="h-9" />
        </div>
        <div className="ml-auto flex gap-4 text-sm">
          <div><span className="text-muted-foreground">Total frete:</span> <strong>{fmtBRL(totalFrete)}</strong></div>
          <div><span className="text-muted-foreground">Peso:</span> <strong>{fmtKg(totalPeso)} kg</strong></div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
                <TableHead className="text-right">CT-es</TableHead>
                <TableHead className="text-right">Frete rateado</TableHead>
                <TableHead className="text-right">R$/kg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">Sem CT-es vinculados no período</TableCell></TableRow>
              )}
              {data.map((r) => (
                <TableRow key={r.vendedor_id}>
                  <TableCell className="font-medium">{r.nome_vendedor}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.codigo_vendedor}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtKg(r.peso_kg)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.ctes_count}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{fmtBRL(r.frete_rateado)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBRL(r.peso_kg > 0 ? r.frete_rateado / r.peso_kg : 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}