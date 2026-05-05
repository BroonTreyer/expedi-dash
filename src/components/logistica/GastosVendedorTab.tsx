import { Fragment, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Loader2, Users } from "lucide-react";
import { useGastosVendedor } from "@/hooks/useGastosVendedor";
import { format, subDays, parseISO } from "date-fns";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtKg = (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(n || 0);
const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;
const fmtDate = (s: string | null) => {
  if (!s) return "—";
  try { return format(parseISO(s), "dd/MM/yyyy"); } catch { return s; }
};

export function GastosVendedorTab() {
  const [di, setDi] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [df, setDf] = useState(format(new Date(), "yyyy-MM-dd"));
  const [vendFilter, setVendFilter] = useState<string>("__all__");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: raw = [], isLoading } = useGastosVendedor(di, df);

  const data = useMemo(
    () => (vendFilter === "__all__" ? raw : raw.filter((r) => r.vendedor_id === vendFilter)),
    [raw, vendFilter],
  );

  const totalFrete = data.reduce((s, r) => s + r.frete_rateado, 0);
  const totalPeso = data.reduce((s, r) => s + r.peso_kg, 0);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={di} onChange={(e) => setDi(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={df} onChange={(e) => setDf(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1 min-w-[200px]">
          <Label className="text-xs">Vendedor</Label>
          <Select value={vendFilter} onValueChange={setVendFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {raw.map((r) => (
                <SelectItem key={r.vendedor_id} value={r.vendedor_id}>{r.nome_vendedor}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <TableHead className="w-8"></TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
                <TableHead className="text-right">Cargas</TableHead>
                <TableHead className="text-right">CT-es</TableHead>
                <TableHead className="text-right">Frete rateado</TableHead>
                <TableHead className="text-right">R$/kg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">Sem CT-es vinculados no período</TableCell></TableRow>
              )}
              {data.map((r) => {
                const open = expanded.has(r.vendedor_id);
                return (
                  <Fragment key={r.vendedor_id}>
                    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => toggle(r.vendedor_id)}>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); toggle(r.vendedor_id); }}>
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{r.nome_vendedor}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.codigo_vendedor}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtKg(r.peso_kg)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.cargas_count}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.ctes_count}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{fmtBRL(r.frete_rateado)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(r.peso_kg > 0 ? r.frete_rateado / r.peso_kg : 0)}</TableCell>
                    </TableRow>
                    {open && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell colSpan={7} className="p-0">
                          <div className="p-3 space-y-3">
                            {r.detalhes.map((d, idx) => (
                              <div key={idx} className="border rounded-md p-3 bg-background space-y-2">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  <strong>{d.nome_carga ?? d.carga_id}</strong>
                                  <span className="text-xs text-muted-foreground">({d.carga_id})</span>
                                  <Badge variant="outline" className="text-[11px]">CT-e {d.numero_cte}</Badge>
                                  <span className="text-xs text-muted-foreground">{fmtDate(d.data_emissao)}</span>
                                  {d.vendedores_na_carga > 1 && (
                                    <Badge variant="secondary" className="text-[11px] gap-1">
                                      <Users className="h-3 w-3" /> {d.vendedores_na_carga} vendedores
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                  <div><span className="text-muted-foreground">Peso vendedor:</span> <strong>{fmtKg(d.peso_vendedor_kg)} kg</strong></div>
                                  <div><span className="text-muted-foreground">Peso total carga:</span> {fmtKg(d.peso_total_carga_kg)} kg</div>
                                  <div><span className="text-muted-foreground">Share:</span> <strong>{fmtPct(d.share_percent)}</strong></div>
                                  <div><span className="text-muted-foreground">Frete rateado:</span> <strong className="text-foreground">{fmtBRL(d.frete_rateado)}</strong> <span className="text-muted-foreground">de {fmtBRL(d.valor_frete_total)}</span></div>
                                </div>
                                {d.pedidos.length > 0 && (
                                  <div className="border-t pt-2">
                                    <div className="text-xs text-muted-foreground mb-1">Pedidos consolidados deste vendedor na carga:</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 text-xs">
                                      {d.pedidos.map((p, i) => (
                                        <div key={i} className="flex justify-between gap-2 px-2 py-1 rounded bg-muted/40">
                                          <span><span className="text-muted-foreground">#{p.numero_pedido ?? "—"}</span> {p.cliente ?? "—"}</span>
                                          <span className="tabular-nums">{fmtKg(p.peso)} kg</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
