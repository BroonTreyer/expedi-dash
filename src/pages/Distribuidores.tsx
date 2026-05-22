import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { useDistribuidores, marcarComoDistribuidor } from "@/hooks/useDistribuidores";
import { useClientes } from "@/hooks/useClientes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Clock, Search, UserPlus, AlertTriangle } from "lucide-react";
import { TimelineDrawer } from "@/components/timeline/TimelineDrawer";
import { formatDuracao } from "@/lib/timeline-utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function statusDoPedido(p: { etapa: string; horario_real_saida: string | null; horario_saida_final: string | null; horario_chegada: string | null; horario_entrada: string | null; carga_id: string | null }) {
  if (p.horario_real_saida || p.horario_saida_final) return "Expedido";
  if (p.horario_entrada) return "No pátio";
  if (p.horario_chegada) return "Na portaria";
  if (p.carga_id) return "Pré-carga fechada";
  return "Em vendas";
}

function diffMin(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb) || tb < ta) return null;
  return Math.round((tb - ta) / 60000);
}

export default function Distribuidores() {
  const { data, isLoading } = useDistribuidores(60);
  const { data: todosClientes = [] } = useClientes();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [pedidoSelecionado, setPedidoSelecionado] = useState<string | null>(null);
  const [marcarOpen, setMarcarOpen] = useState(false);
  const [marcarBusca, setMarcarBusca] = useState("");
  const [marcarSelecionados, setMarcarSelecionados] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);

  const distribuidores = data?.distribuidores ?? [];

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return distribuidores;
    return distribuidores.filter(
      (d) =>
        d.nome_cliente.toLowerCase().includes(q) ||
        d.codigo_cliente.toLowerCase().includes(q) ||
        (d.cidade ?? "").toLowerCase().includes(q)
    );
  }, [distribuidores, busca]);

  const kpis = useMemo(() => {
    const pedidos = data?.pedidos ?? [];
    const expedidos = pedidos.filter((p) => p.horario_real_saida || p.horario_saida_final);
    const ciclos = expedidos
      .map((p) => diffMin(p.created_at, p.horario_real_saida || p.horario_saida_final))
      .filter((v): v is number => v != null);
    const patio = expedidos
      .map((p) => diffMin(p.horario_chegada, p.horario_real_saida || p.horario_saida_final))
      .filter((v): v is number => v != null);
    const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
    return {
      qtdDistribuidores: distribuidores.length,
      qtdPedidos: pedidos.length,
      qtdEmAberto: pedidos.filter((p) => !p.horario_real_saida && !p.horario_saida_final).length,
      cicloMedio: avg(ciclos),
      patioMedio: avg(patio),
    };
  }, [data, distribuidores]);

  const clientesNaoDistribuidor = useMemo(() => {
    const codigosDistr = new Set(distribuidores.map((d) => d.codigo_cliente));
    return (todosClientes as any[]).filter((c) => !codigosDistr.has(c.codigo_cliente));
  }, [todosClientes, distribuidores]);

  const clientesParaMarcar = useMemo(() => {
    const q = marcarBusca.trim().toLowerCase();
    const base = clientesNaoDistribuidor;
    if (!q) return base.slice(0, 200);
    return base
      .filter(
        (c: any) =>
          (c.nome_cliente ?? "").toLowerCase().includes(q) ||
          (c.codigo_cliente ?? "").toLowerCase().includes(q) ||
          (c.cidade ?? "").toLowerCase().includes(q)
      )
      .slice(0, 200);
  }, [clientesNaoDistribuidor, marcarBusca]);

  async function salvarMarcacao() {
    if (marcarSelecionados.size === 0) {
      setMarcarOpen(false);
      return;
    }
    setSalvando(true);
    try {
      const n = await marcarComoDistribuidor(Array.from(marcarSelecionados), "distribuidor");
      toast.success(`${n} cliente(s) marcado(s) como distribuidor.`);
      qc.invalidateQueries({ queryKey: ["distribuidores"] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
      setMarcarSelecionados(new Set());
      setMarcarOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Layout>
      <main className="container mx-auto p-4 sm:p-6 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Distribuidores
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acompanhe o ciclo completo dos pedidos dos seus distribuidores: do registro à expedição.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar distribuidor, código, cidade..."
                className="pl-8 h-9"
              />
            </div>
            <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => setMarcarOpen(true)}>
              <UserPlus className="h-4 w-4" /> Marcar clientes
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Kpi label="Distribuidores" value={kpis.qtdDistribuidores.toString()} />
          <Kpi label="Pedidos (60d)" value={kpis.qtdPedidos.toString()} />
          <Kpi label="Em aberto" value={kpis.qtdEmAberto.toString()} />
          <Kpi label="Ciclo médio" value={formatDuracao(kpis.cicloMedio)} />
          <Kpi label="Tempo médio no pátio" value={formatDuracao(kpis.patioMedio)} />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              {distribuidores.length === 0
                ? "Nenhum cliente marcado como distribuidor. Clique em \"Marcar clientes\" para começar."
                : "Nenhum distribuidor corresponde à busca."}
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {filtrados.map((d) => (
              <AccordionItem key={d.codigo_cliente} value={d.codigo_cliente} className="border rounded-lg bg-card">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex flex-1 items-center justify-between gap-3 pr-2">
                    <div className="text-left min-w-0">
                      <div className="font-medium text-sm truncate">{d.nome_cliente}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Cód. {d.codigo_cliente}
                        {d.cidade && ` · ${d.cidade}${d.uf ? "/" + d.uf : ""}`}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {d.pedidos.length} pedido{d.pedidos.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-3">
                  {d.pedidos.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-3">Sem pedidos no período.</p>
                  ) : (
                    <div className="divide-y">
                      {d.pedidos.map((p) => {
                        const st = statusDoPedido(p);
                        const expedido = p.horario_real_saida || p.horario_saida_final;
                        const ciclo = diffMin(p.created_at, expedido);
                        return (
                          <div
                            key={p.id}
                            className="grid grid-cols-[60px_minmax(0,1fr)_auto_auto] gap-2 items-center px-2 py-2"
                          >
                            <span className="font-mono text-xs text-muted-foreground">
                              #{p.numero_pedido ?? "—"}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs truncate">{p.nome_produto ?? "—"}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {new Date(p.data + "T00:00:00").toLocaleDateString("pt-BR")}
                                {p.carga_id && (
                                  <span className="ml-2 font-mono">{p.nome_carga || p.carga_id}</span>
                                )}
                                {p.ruptura && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                                    <AlertTriangle className="h-3 w-3" />
                                    ruptura
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={expedido ? "default" : "outline"} className="text-[10px]">
                                {st}
                              </Badge>
                              {ciclo != null && (
                                <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                                  {formatDuracao(ciclo)}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setPedidoSelecionado(p.id)}
                            >
                              <Clock className="h-3 w-3" /> Linha do tempo
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        <TimelineDrawer
          open={!!pedidoSelecionado}
          onOpenChange={(o) => !o && setPedidoSelecionado(null)}
          pedidoId={pedidoSelecionado}
        />

        <Dialog open={marcarOpen} onOpenChange={setMarcarOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Marcar clientes como distribuidor</DialogTitle>
              <DialogDescription>
                Selecione um ou mais clientes. Eles passarão a aparecer aqui com sua linha do tempo completa.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={marcarBusca}
                onChange={(e) => setMarcarBusca(e.target.value)}
                placeholder="Buscar cliente por código, nome ou cidade..."
              />
              <div className="max-h-[50vh] overflow-y-auto border rounded-md divide-y">
                {clientesParaMarcar.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground text-center">
                    Nenhum cliente encontrado{marcarBusca ? "" : ". Comece a digitar para buscar"}.
                  </p>
                ) : (
                  clientesParaMarcar.map((c: any) => {
                    const sel = marcarSelecionados.has(c.codigo_cliente);
                    return (
                      <label
                        key={c.codigo_cliente}
                        className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={(e) => {
                            setMarcarSelecionados((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(c.codigo_cliente);
                              else next.delete(c.codigo_cliente);
                              return next;
                            });
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{c.nome_cliente}</div>
                          <div className="text-[11px] text-muted-foreground">
                            Cód. {c.codigo_cliente}
                            {c.cidade && ` · ${c.cidade}${c.uf ? "/" + c.uf : ""}`}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {marcarSelecionados.size} selecionado(s)
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setMarcarOpen(false)} disabled={salvando}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={salvarMarcacao} disabled={salvando || marcarSelecionados.size === 0}>
                    {salvando ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </Layout>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-lg sm:text-xl font-semibold tabular-nums mt-0.5">{value}</div>
      </CardContent>
    </Card>
  );
}