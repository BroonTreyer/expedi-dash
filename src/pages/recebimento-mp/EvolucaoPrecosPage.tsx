import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, LineChart as LineIcon, X } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useMpEvolucaoPreco } from "@/hooks/useMpEvolucaoPreco";
import { useProdutosMp } from "@/hooks/useProdutosMp";
import { fmtBRL } from "@/lib/mp-export";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "#3B82F6", "#F59E0B", "#10B981", "#8B5CF6"];

function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysAgoISO(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

export default function EvolucaoPrecosPage() {
  const { data: produtos = [] } = useProdutosMp();
  const [de, setDe] = useState(daysAgoISO(90));
  const [ate, setAte] = useState(todayISO());
  const [selecionados, setSelecionados] = useState<string[]>([]);

  useEffect(() => {
    if (selecionados.length === 0 && produtos.length > 0) {
      setSelecionados(produtos.slice(0, Math.min(3, produtos.length)).map((p: any) => p.nome));
    }
  }, [produtos, selecionados.length]);

  const { data = [], isLoading } = useMpEvolucaoPreco(selecionados, { de, ate });

  // Pivota para gráfico: { dia, [produto]: preco }
  const chartData = useMemo(() => {
    const dias = new Map<string, any>();
    data.forEach((r) => {
      const k = r.dia;
      const row = dias.get(k) ?? { dia: k };
      row[r.produto_nome] = Number(r.preco_medio_ton);
      dias.set(k, row);
    });
    return Array.from(dias.values()).sort((a, b) => a.dia.localeCompare(b.dia));
  }, [data]);

  const stats = useMemo(() => {
    const map = new Map<string, { min: number; max: number; med: number; n: number; ref?: number }>();
    data.forEach((r) => {
      const cur = map.get(r.produto_nome) ?? { min: Infinity, max: 0, med: 0, n: 0 };
      cur.min = Math.min(cur.min, Number(r.preco_min_ton));
      cur.max = Math.max(cur.max, Number(r.preco_max_ton));
      cur.med += Number(r.preco_medio_ton); cur.n++;
      map.set(r.produto_nome, cur);
    });
    return Array.from(map.entries()).map(([nome, v]) => {
      const p = produtos.find((x: any) => x.nome === nome);
      const med = v.n > 0 ? v.med / v.n : 0;
      const ref = p?.preco_referencia_ton ? Number(p.preco_referencia_ton) : null;
      return { nome, min: v.min, max: v.max, med, ref, deltaRef: ref ? ((med - ref) / ref) * 100 : null };
    });
  }, [data, produtos]);

  function toggle(nome: string) {
    setSelecionados((s) => {
      if (s.includes(nome)) return s.filter((x) => x !== nome);
      if (s.length >= 5) return s;
      return [...s, nome];
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="h-9 w-40" />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="h-9 w-40" />
        </div>
        <div className="ml-auto text-[11px] text-muted-foreground">Selecione até 5 produtos</div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-1.5">
            {produtos.map((p: any, i: number) => {
              const on = selecionados.includes(p.nome);
              const idx = selecionados.indexOf(p.nome);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.nome)}
                  className={`text-xs px-2 py-1 rounded-md border transition-colors ${on ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                  style={on ? { borderColor: COLORS[idx % COLORS.length] } : {}}
                >
                  {on && <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: COLORS[idx % COLORS.length] }} />}
                  {p.nome}
                  {on && <X className="inline-block h-3 w-3 ml-1 opacity-60" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card><CardContent className="p-4">
        <div className="text-sm font-semibold mb-2 flex items-center gap-2"><LineIcon className="h-4 w-4" /> Preço R$/ton ao longo do tempo</div>
        {isLoading ? (
          <div className="py-16 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : chartData.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Selecione produtos e ajuste o período.</div>
        ) : (
          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtBRL(v)} width={90} />
                <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                <Legend />
                {selecionados.map((nome, i) => (
                  <Line key={nome} dataKey={nome} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Mín</TableHead>
              <TableHead className="text-right">Médio</TableHead>
              <TableHead className="text-right">Máx</TableHead>
              <TableHead className="text-right">Referência</TableHead>
              <TableHead className="text-right">Δ% vs ref</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((s) => (
              <TableRow key={s.nome}>
                <TableCell className="font-medium">{s.nome}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBRL(s.min)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBRL(s.med)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBRL(s.max)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{s.ref ? fmtBRL(s.ref) : "—"}</TableCell>
                <TableCell className="text-right">
                  {s.deltaRef == null
                    ? <span className="text-muted-foreground">—</span>
                    : <Badge variant={s.deltaRef > 5 ? "destructive" : s.deltaRef < -5 ? "default" : "outline"}>
                        {s.deltaRef > 0 ? "+" : ""}{s.deltaRef.toFixed(1)}%
                      </Badge>}
                </TableCell>
              </TableRow>
            ))}
            {stats.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem dados no período.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}