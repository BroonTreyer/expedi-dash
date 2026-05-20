import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, BarChart3, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useMpComprasProduto, useMpComprasProdutoDrilldown, type ComprasProdutoRow } from "@/hooks/useMpComprasProduto";
import { exportarXLSX, fmtBRL, fmtTon, fmtPct } from "@/lib/mp-export";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

function currentMonthISO(): string {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function prevMonthISO(mesISO: string): string {
  const d = new Date(mesISO); d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}
function prevYearMonthISO(mesISO: string): string {
  const d = new Date(mesISO); d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}
function fmtMonthLabel(mesISO: string) {
  const d = new Date(mesISO);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function useSparkline(produtoNome: string | null) {
  const session = useSession();
  return useQuery({
    queryKey: ["mp_compras_produto_spark", produtoNome],
    enabled: !!session && !!produtoNome,
    queryFn: async () => {
      const seisMeses = new Date(); seisMeses.setMonth(seisMeses.getMonth() - 5); seisMeses.setDate(1);
      const { data, error } = await (supabase as any)
        .from("mp_compras_mensal_produto")
        .select("mes,ton")
        .eq("produto_nome", produtoNome)
        .gte("mes", seisMeses.toISOString().slice(0, 10))
        .order("mes", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

function Sparkline({ produto }: { produto: string }) {
  const { data } = useSparkline(produto);
  if (!data || data.length < 2) return <div className="text-[10px] text-muted-foreground">—</div>;
  return (
    <div style={{ width: 80, height: 28 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <YAxis hide domain={["auto", "auto"]} />
          <Line dataKey="ton" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  const up = value > 0.05, down = value < -0.05;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const cls = up ? "text-emerald-600" : down ? "text-rose-600" : "text-muted-foreground";
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${cls}`}><Icon className="h-3 w-3" />{fmtPct(value)}</span>;
}

export default function ComprasProdutoPage() {
  const [mes, setMes] = useState(currentMonthISO());
  const [compMode, setCompMode] = useState<"mes_anterior" | "ano_anterior" | "nenhum">("mes_anterior");
  const mesComp = compMode === "mes_anterior" ? prevMonthISO(mes) : compMode === "ano_anterior" ? prevYearMonthISO(mes) : null;
  const { data = [], isLoading } = useMpComprasProduto(mes, mesComp);
  const [drillProduto, setDrillProduto] = useState<ComprasProdutoRow | null>(null);

  const totals = useMemo(() => ({
    ton: data.reduce((a, r) => a + Number(r.ton ?? 0), 0),
    valor: data.reduce((a, r) => a + Number(r.valor ?? 0), 0),
    descargas: data.reduce((a, r) => a + Number(r.qtd_descargas ?? 0), 0),
  }), [data]);

  function exportar() {
    const rows = data.map((r) => ({
      Produto: r.produto_nome,
      Categoria: r.categoria ?? "",
      "Peso (ton)": Number(r.ton.toFixed(3)),
      "Valor (R$)": Number(r.valor.toFixed(2)),
      "Preço médio R$/ton": Number(r.preco_medio_ton.toFixed(2)),
      "Descargas": r.qtd_descargas,
      "Fornecedores": r.qtd_fornecedores,
      [`Δ% Ton vs ${compMode}`]: r.deltaTon != null ? Number(r.deltaTon.toFixed(1)) : null,
      [`Δ% Preço vs ${compMode}`]: r.deltaPreco != null ? Number(r.deltaPreco.toFixed(1)) : null,
    }));
    exportarXLSX(`compras_produto_${mes.slice(0, 7)}.xlsx`, { Compras: rows });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Mês de referência</Label>
          <Input type="month" value={mes.slice(0, 7)} onChange={(e) => setMes(e.target.value + "-01")} className="h-9 w-44" />
        </div>
        <div>
          <Label className="text-xs">Comparar com</Label>
          <Select value={compMode} onValueChange={(v) => setCompMode(v as any)}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes_anterior">Mês anterior</SelectItem>
              <SelectItem value="ano_anterior">Mesmo mês — ano anterior</SelectItem>
              <SelectItem value="nenhum">Sem comparativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportar} disabled={!data.length}>
            <Download className="h-4 w-4 mr-2" /> Exportar XLSX
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Produtos" value={data.length} />
        <Kpi label="Toneladas" value={fmtTon(totals.ton)} />
        <Kpi label="Valor total" value={fmtBRL(totals.valor)} />
        <Kpi label="Descargas" value={totals.descargas} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : data.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhuma compra registrada em {fmtMonthLabel(mes)}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Peso (ton)</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">R$/ton médio</TableHead>
                    <TableHead className="text-right">Δ Ton</TableHead>
                    <TableHead className="text-right">Δ Preço</TableHead>
                    <TableHead>Tendência 6m</TableHead>
                    <TableHead className="text-right">Descargas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((r) => (
                    <TableRow key={r.produto_nome} className="cursor-pointer hover:bg-muted/30" onClick={() => setDrillProduto(r)}>
                      <TableCell className="font-medium">{r.produto_nome}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.categoria ?? "—"}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{fmtTon(r.ton)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(r.valor)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(r.preco_medio_ton)}</TableCell>
                      <TableCell className="text-right"><DeltaBadge value={r.deltaTon} /></TableCell>
                      <TableCell className="text-right"><DeltaBadge value={r.deltaPreco} /></TableCell>
                      <TableCell><Sparkline produto={r.produto_nome} /></TableCell>
                      <TableCell className="text-right tabular-nums">{r.qtd_descargas}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DrilldownSheet produto={drillProduto} mes={mes} onClose={() => setDrillProduto(null)} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: any }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums mt-1">{value}</div>
    </CardContent></Card>
  );
}

function DrilldownSheet({ produto, mes, onClose }: { produto: ComprasProdutoRow | null; mes: string; onClose: () => void }) {
  const { data: rows = [], isLoading } = useMpComprasProdutoDrilldown(produto?.produto_nome ?? null, mes);
  return (
    <Sheet open={!!produto} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{produto?.produto_nome ?? ""}</SheetTitle>
          <div className="text-xs text-muted-foreground">{fmtMonthLabel(mes)} · {rows.length} descarga(s)</div>
        </SheetHeader>
        {isLoading ? (
          <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></div>
        ) : (
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>NF</TableHead>
                <TableHead className="text-right">Ton</TableHead>
                <TableHead className="text-right">R$/ton</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.recebimento?.data_chegada ? new Date(r.recebimento.data_chegada).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-xs">{r.recebimento?.fornecedor_nome ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.nota_fiscal ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtTon(Number(r.peso_ton))}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBRL(Number(r.valor_unitario_ton))}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBRL(Number(r.valor_total_linha))}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem descargas no período.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </SheetContent>
    </Sheet>
  );
}