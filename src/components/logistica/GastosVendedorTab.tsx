import { Fragment, forwardRef, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Loader2, Users, AlertTriangle, FileText, Info } from "lucide-react";
import { useGastosVendedor } from "@/hooks/useGastosVendedor";
import { format, subDays, parseISO } from "date-fns";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtKg = (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(n || 0);
const fmtPct = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`);
const fmtDate = (s: string | null) => {
  if (!s) return "—";
  try { return format(parseISO(s), "dd/MM/yyyy"); } catch { return s; }
};

export function GastosVendedorTab() {
  const [di, setDi] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [df, setDf] = useState(format(new Date(), "yyyy-MM-dd"));
  const [vendFilter, setVendFilter] = useState<string>("__all__");
  const [soSemTarifa, setSoSemTarifa] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useGastosVendedor(di, df);
  const raw = data?.vendedores ?? [];
  const cobertura = data?.cobertura ?? { cif: 0, fob: 0, misto: 0, nao_classificado: 0, total: 0 };

  const filtered = useMemo(() => {
    let list = vendFilter === "__all__" ? raw : raw.filter((r) => r.vendedor_id === vendFilter);
    if (soSemTarifa) {
      list = list
        .map((r) => ({ ...r, detalhes: r.detalhes.filter((d) => d.destinos_sem_tarifa > 0) }))
        .filter((r) => r.detalhes.length > 0);
    }
    return list;
  }, [raw, vendFilter, soSemTarifa]);

  const totalPrevisto = filtered.reduce((s, r) => s + r.frete_previsto, 0);
  const totalRealizado = filtered.reduce((s, r) => s + r.frete_realizado, 0);
  const totalPeso = filtered.reduce((s, r) => s + r.peso_kg, 0);
  const divPct = totalPrevisto > 0 ? ((totalRealizado - totalPrevisto) / totalPrevisto) * 100 : null;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
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
          <Button
            variant={soSemTarifa ? "default" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => setSoSemTarifa((v) => !v)}
          >
            <AlertTriangle className="h-4 w-4 mr-1" /> Só sem tarifa
          </Button>
        </div>

        {cobertura.total > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs rounded-md border bg-muted/40 px-3 py-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Cobertura no período (FOB excluído):</span>
            <Badge variant="default" className="text-[11px]">CIF: {cobertura.cif}</Badge>
            <Badge variant="outline" className="text-[11px]">Não classificadas: {cobertura.nao_classificado}</Badge>
            {cobertura.nao_classificado > 0 && (
              <span className="text-muted-foreground">— preencha o campo "Tipo de Frete" nos pedidos para precisão.</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Tabela" value={fmtBRL(totalPrevisto)} />
          <Kpi label="Valor do CT-e" value={fmtBRL(totalRealizado)} sub={totalRealizado === 0 ? "sem CT-es" : undefined} />
          <Kpi
            label="Divergência"
            value={fmtPct(divPct)}
            sub={`${fmtBRL(totalRealizado - totalPrevisto)} · CT-e − Tabela`}
            tone={divPct == null ? "muted" : divPct > 2 ? "warn" : divPct < -2 ? "good" : "muted"}
          />
          <Kpi label="Peso total" value={`${fmtKg(totalPeso)} kg`} />
        </div>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
          <div className="flex items-start gap-2"><Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span><strong className="text-foreground">Tabela</strong>: valor calculado pela tabela de frete cadastrada (R$/kg × peso por destino, conforme tipo de caminhão).</span></div>
          <div className="pl-5"><strong className="text-foreground">Valor do CT-e</strong>: valor efetivamente cobrado pela transportadora, lido dos DACTEs importados.</div>
          <div className="pl-5"><strong className="text-foreground">Divergência</strong>: <code>Valor do CT-e − Tabela</code>. Positivo = transportadora cobrou acima da tabela.</div>
        </div>
      </Card>

      <Card className="p-0">
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
                  <TableHead className="text-right">Cobertura CT-e</TableHead>
                  <TableHead className="text-right">Tabela</TableHead>
                  <TableHead className="text-right">Valor do CT-e</TableHead>
                  <TableHead className="text-right">R$/kg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">
                    Nenhuma carga CIF/não classificada no período {soSemTarifa ? "com destinos sem tarifa" : ""}
                  </TableCell></TableRow>
                )}
                {filtered.map((r) => {
                  const open = expanded.has(r.vendedor_id);
                  const rkg = r.peso_kg > 0 ? r.frete_previsto / r.peso_kg : 0;
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
                        <TableCell className="text-right tabular-nums">
                          <Badge variant={r.cobertura_cte_pct >= 80 ? "default" : r.cobertura_cte_pct > 0 ? "secondary" : "outline"} className="text-[11px]">
                            {r.cobertura_cte_pct.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{fmtBRL(r.frete_previsto)}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.frete_realizado > 0 ? fmtBRL(r.frete_realizado) : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtBRL(rkg)}</TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell></TableCell>
                          <TableCell colSpan={8} className="p-0">
                            <div className="p-3 space-y-3">
                              {r.detalhes.map((d, idx) => (
                                <div key={idx} className="border rounded-md p-3 bg-background space-y-2">
                                  <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <strong>{d.nome_carga ?? d.carga_id}</strong>
                                    <span className="text-xs text-muted-foreground">({d.carga_id})</span>
                                    <Badge variant="outline" className="text-[11px] capitalize">{d.tipo_veiculo_normalizado}</Badge>
                                    <Badge
                                      variant={d.tipo_frete_carga === "cif" ? "default" : d.tipo_frete_carga === "fob" ? "secondary" : "outline"}
                                      className="text-[11px] uppercase"
                                    >
                                      {d.tipo_frete_carga === "nao_classificado" ? "?" : d.tipo_frete_carga}
                                    </Badge>
                                    {d.ordem_carga && <Badge variant="secondary" className="text-[11px]">OC {d.ordem_carga}</Badge>}
                                    {d.numero_cte ? (
                                      <Badge variant="default" className="text-[11px] gap-1"><FileText className="h-3 w-3" /> CT-e {d.numero_cte}</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[11px] text-muted-foreground">sem CT-e</Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground">{fmtDate(d.data)}</span>
                                    {d.vendedores_na_carga > 1 && (
                                      <Badge variant="secondary" className="text-[11px] gap-1">
                                        <Users className="h-3 w-3" /> {d.vendedores_na_carga} vendedores
                                      </Badge>
                                    )}
                                    {d.destinos_sem_tarifa > 0 && (
                                      <Badge variant="destructive" className="text-[11px] gap-1">
                                        <AlertTriangle className="h-3 w-3" /> {d.destinos_sem_tarifa} destino(s) sem tarifa
                                      </Badge>
                                    )}
                                    {d.destinos_em_conflito > 0 && (
                                      <Badge variant="destructive" className="text-[11px] gap-1">
                                        <AlertTriangle className="h-3 w-3" /> {d.destinos_em_conflito} destino(s) em conflito
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                                    <div><span className="text-muted-foreground">Peso vendedor:</span> <strong>{fmtKg(d.peso_vendedor_kg)} kg</strong></div>
                                    <div><span className="text-muted-foreground">Peso total carga:</span> {fmtKg(d.peso_total_carga_kg)} kg</div>
                                    <div><span className="text-muted-foreground">Tabela:</span> <strong>{fmtBRL(d.previsto)}</strong></div>
                                    <div>
                                      <span className="text-muted-foreground">Valor do CT-e:</span>{" "}
                                      {d.realizado != null ? <strong>{fmtBRL(d.realizado)}</strong> : <span className="text-muted-foreground">—</span>}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Diferença:</span>{" "}
                                      {d.realizado != null ? (() => {
                                        const diff = d.realizado - d.previsto;
                                        const tone = d.divergencia_pct != null && d.divergencia_pct > 2 ? "text-destructive" : d.divergencia_pct != null && d.divergencia_pct < -2 ? "text-emerald-600" : "text-muted-foreground";
                                        return (
                                          <strong className={tone}>
                                            {diff >= 0 ? "+" : ""}{fmtBRL(diff)}{d.divergencia_pct != null && <span className="font-normal"> ({fmtPct(d.divergencia_pct)})</span>}
                                          </strong>
                                        );
                                      })() : <span className="text-muted-foreground">—</span>}
                                    </div>
                                  </div>

                                  <div className="border-t pt-2">
                                    <div className="text-xs text-muted-foreground mb-1">Destinos da carga (tabela de frete · {d.tipo_veiculo_normalizado}):</div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-muted-foreground border-b">
                                            <th className="text-left py-1 pr-2">Cidade/UF</th>
                                            <th className="text-right py-1 px-2">Peso</th>
                                            <th className="text-right py-1 px-2">R$/kg</th>
                                            <th className="text-right py-1 pl-2">Frete</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {d.destinos.map((dest, di2) => (
                                            <tr key={di2} className="border-b last:border-0 align-top">
                                              <td className="py-1 pr-2">
                                                {dest.cidade}/{dest.uf}
                                                {dest.sem_tarifa && (
                                                  <Badge variant="destructive" className="ml-2 text-[10px]">sem tarifa</Badge>
                                                )}
                                                {dest.conflito && (
                                                  <>
                                                    <Badge variant="destructive" className="ml-2 text-[10px]">conflito</Badge>
                                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                                      {dest.tabelas_divergentes.map((t, ti) => (
                                                        <span key={ti} className="mr-2">{t.nome}: {fmtBRL(t.valor_kg)}/kg</span>
                                                      ))}
                                                    </div>
                                                  </>
                                                )}
                                              </td>
                                              <td className="text-right py-1 px-2 tabular-nums">{fmtKg(dest.peso)} kg</td>
                                              <td className="text-right py-1 px-2 tabular-nums">{dest.conflito ? "—" : fmtBRL(dest.valor_kg)}</td>
                                              <td className="text-right py-1 pl-2 tabular-nums">{dest.conflito ? "—" : fmtBRL(dest.frete)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {d.pedidos.length > 0 && (
                                    <div className="border-t pt-2">
                                      <div className="text-xs text-muted-foreground mb-1">Pedidos consolidados deste vendedor na carga:</div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 text-xs">
                                        {d.pedidos.map((p, i) => (
                                          <div key={i} className="flex justify-between gap-2 px-2 py-1 rounded bg-muted/40">
                                            <span><span className="text-muted-foreground">#{p.numero_pedido ?? "—"}</span> {p.cliente ?? "—"} <span className="text-muted-foreground">· {p.cidade}/{p.uf}</span></span>
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
    </div>
  );
}

type KpiProps = { label: string; value: string; sub?: string; tone?: "muted" | "good" | "warn" };
const Kpi = forwardRef<HTMLDivElement, KpiProps>(({ label, value, sub, tone = "muted" }, ref) => {
  const toneClass = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-destructive" : "text-foreground";
  return (
    <div ref={ref} className="rounded-md border p-3 bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground tabular-nums">{sub}</div>}
    </div>
  );
});
Kpi.displayName = "Kpi";
