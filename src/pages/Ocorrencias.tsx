import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertOctagon, Search } from "lucide-react";
import { useOcorrencias } from "@/hooks/useOcorrencias";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Ocorrencias() {
  const [from, setFrom] = useState<string>(dateNDaysAgo(30));
  const [to, setTo] = useState<string>(todayStr());
  const [busca, setBusca] = useState("");

  const { data: ocorrencias = [], isLoading } = useOcorrencias(from, to);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return ocorrencias;
    return ocorrencias.filter((o) => {
      const hay = [o.motivo, o.observacao, o.placa, o.motorista, o.nome_carga, o.carga_id, o.transportadora, o.registrado_por_email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [ocorrencias, busca]);

  const fmtDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  return (
    <Layout>
      <main className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-destructive/10 p-2">
            <AlertOctagon className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Ocorrências de carga</h1>
            <p className="text-xs text-muted-foreground">
              Histórico de cargas canceladas e problemas operacionais (motorista foi embora, atrasos, etc.).
            </p>
          </div>
          <Badge variant="outline" className="font-mono">{filtered.length}</Badge>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">De</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Até</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Buscar</Label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Motivo, placa, motorista, carga…"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhuma ocorrência encontrada no período.
              </div>
            ) : (
              <>
                {/* Tabela em telas md+ */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quando</TableHead>
                        <TableHead>Carga</TableHead>
                        <TableHead>Motorista / Placa</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Observação</TableHead>
                        <TableHead className="text-right">Peso · Pedidos</TableHead>
                        <TableHead>Registrado por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="text-xs whitespace-nowrap font-mono">{fmtDateTime(o.created_at)}</TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium">{o.nome_carga || o.carga_id || "—"}</div>
                            {o.transportadora && <div className="text-muted-foreground">{o.transportadora}</div>}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>{o.motorista || "—"}</div>
                            {o.placa && <div className="font-mono text-muted-foreground">{o.placa}</div>}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="border-destructive/40 bg-destructive/5 text-destructive">
                              {o.motivo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[280px] truncate" title={o.observacao || ""}>
                            {o.observacao || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-right whitespace-nowrap font-mono">
                            {(o.peso_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                            <div className="text-muted-foreground">{o.qtd_pedidos ?? 0} pedido(s)</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{o.registrado_por_email || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Cards mobile */}
                <div className="md:hidden divide-y">
                  {filtered.map((o) => (
                    <div key={o.id} className="p-3 space-y-1.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-sm">{o.nome_carga || o.carga_id || "Carga sem ID"}</div>
                        <span className="font-mono text-muted-foreground whitespace-nowrap">{fmtDateTime(o.created_at)}</span>
                      </div>
                      <Badge variant="outline" className="border-destructive/40 bg-destructive/5 text-destructive">
                        {o.motivo}
                      </Badge>
                      {o.observacao && <div className="text-muted-foreground">{o.observacao}</div>}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                        {o.placa && <span>Placa: <span className="font-mono text-foreground">{o.placa}</span></span>}
                        {o.motorista && <span>{o.motorista}</span>}
                        {o.transportadora && <span>{o.transportadora}</span>}
                      </div>
                      <div className="text-muted-foreground">
                        {(o.peso_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg · {o.qtd_pedidos ?? 0} pedido(s)
                      </div>
                      {o.registrado_por_email && (
                        <div className="text-[10px] text-muted-foreground">por {o.registrado_por_email}</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}