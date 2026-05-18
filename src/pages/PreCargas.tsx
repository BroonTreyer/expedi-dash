import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { usePreCargas } from "@/hooks/usePreCargas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Package, Pencil, Search, Truck, MapPin, User } from "lucide-react";
import { temRuptura } from "@/lib/ruptura-utils";
import { pesoEfetivo, pesoNaoCarregado } from "@/lib/peso-utils";
import { cn } from "@/lib/utils";
import { EditarPedidoAprovacaoDialog } from "@/components/aprovacoes/EditarPedidoAprovacaoDialog";
import type { Carregamento } from "@/hooks/useCarregamentos";

type Item = Carregamento & { ruptura_sinalizada?: boolean; forma_pagamento?: string | null };

interface PedidoGrupo {
  numero_pedido: number;
  cliente: string | null;
  codigo_cliente: string | null;
  cidade: string | null;
  uf: string | null;
  vendedor: string | null;
  itens: Item[];
  pesoTotal: number;
  pesoEmbarcado: number;
  pesoRuptura: number;
  qtdRupturas: number;
}

interface PreCargaGrupo {
  cargaId: string;
  nomeCarga: string | null;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  tipoCaminhao: string | null;
  ordemCarga: string | null;
  data: string;
  pedidos: PedidoGrupo[];
  destinos: string;
  qtdPedidos: number;
  pesoTotal: number;
  pesoEmbarcado: number;
  pesoRuptura: number;
  qtdRupturas: number;
}

function formatKg(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function formatDataBr(d: string) {
  try {
    const [y, m, dd] = d.split("-");
    return `${dd}/${m}/${y}`;
  } catch {
    return d;
  }
}

export default function PreCargas() {
  const { data: rows = [], isLoading } = usePreCargas();
  const [busca, setBusca] = useState("");
  const [editGrupo, setEditGrupo] = useState<PedidoGrupo | null>(null);
  const [editCargaCtx, setEditCargaCtx] = useState<PreCargaGrupo | null>(null);

  const preCargas: PreCargaGrupo[] = useMemo(() => {
    const map = new Map<string, PreCargaGrupo>();
    for (const r of rows as Item[]) {
      if (!r.carga_id) continue;
      let g = map.get(r.carga_id);
      if (!g) {
        g = {
          cargaId: r.carga_id,
          nomeCarga: r.nome_carga,
          placa: r.placa,
          motorista: r.motorista,
          transportadora: r.transportadora,
          tipoCaminhao: r.tipo_caminhao,
          ordemCarga: r.ordem_carga,
          data: r.data,
          pedidos: [],
          destinos: "",
          qtdPedidos: 0,
          pesoTotal: 0,
          pesoEmbarcado: 0,
          pesoRuptura: 0,
          qtdRupturas: 0,
        };
        map.set(r.carga_id, g);
      }
    }
    // Group items into pedidos within each carga
    const pedidoBuckets = new Map<string, Map<number, PedidoGrupo>>();
    for (const r of rows as Item[]) {
      if (!r.carga_id || r.numero_pedido == null) continue;
      if (!pedidoBuckets.has(r.carga_id)) pedidoBuckets.set(r.carga_id, new Map());
      const peds = pedidoBuckets.get(r.carga_id)!;
      let p = peds.get(r.numero_pedido);
      if (!p) {
        p = {
          numero_pedido: r.numero_pedido,
          cliente: r.cliente,
          codigo_cliente: r.codigo_cliente,
          cidade: r.cidade,
          uf: r.uf,
          vendedor: r.vendedores?.nome_vendedor ?? null,
          itens: [],
          pesoTotal: 0,
          pesoEmbarcado: 0,
          pesoRuptura: 0,
          qtdRupturas: 0,
        };
        peds.set(r.numero_pedido, p);
      }
      p.itens.push(r);
    }

    for (const [cargaId, peds] of pedidoBuckets) {
      const carga = map.get(cargaId);
      if (!carga) continue;
      const dest = new Set<string>();
      for (const p of peds.values()) {
        let pTot = 0, pEmb = 0, pRup = 0, qRup = 0;
        for (const it of p.itens) {
          const efet = pesoEfetivo(it);
          const rup = pesoNaoCarregado(it);
          pEmb += efet;
          pRup += rup;
          pTot += efet + rup;
          if (temRuptura(it)) qRup += 1;
        }
        p.pesoTotal = pTot;
        p.pesoEmbarcado = pEmb;
        p.pesoRuptura = pRup;
        p.qtdRupturas = qRup;
        carga.pedidos.push(p);
        if (p.cidade) dest.add(`${p.cidade}${p.uf ? "/" + p.uf : ""}`);
      }
      carga.pedidos.sort((a, b) => a.numero_pedido - b.numero_pedido);
      carga.qtdPedidos = carga.pedidos.length;
      carga.pesoEmbarcado = carga.pedidos.reduce((s, p) => s + p.pesoEmbarcado, 0);
      carga.pesoRuptura = carga.pedidos.reduce((s, p) => s + p.pesoRuptura, 0);
      carga.pesoTotal = carga.pesoEmbarcado + carga.pesoRuptura;
      carga.qtdRupturas = carga.pedidos.reduce((s, p) => s + p.qtdRupturas, 0);
      carga.destinos = Array.from(dest).join(", ");
    }

    return Array.from(map.values()).sort((a, b) => b.data.localeCompare(a.data));
  }, [rows]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return preCargas;
    return preCargas.filter((c) => {
      if (c.nomeCarga?.toLowerCase().includes(q)) return true;
      if (c.cargaId.toLowerCase().includes(q)) return true;
      if (c.placa?.toLowerCase().includes(q)) return true;
      if (c.motorista?.toLowerCase().includes(q)) return true;
      if (c.transportadora?.toLowerCase().includes(q)) return true;
      if (c.destinos.toLowerCase().includes(q)) return true;
      if (c.pedidos.some((p) =>
        p.cliente?.toLowerCase().includes(q) ||
        String(p.numero_pedido).includes(q) ||
        p.codigo_cliente?.toLowerCase().includes(q)
      )) return true;
      return false;
    });
  }, [preCargas, busca]);

  // KPIs globais (sobre o conjunto FILTRADO)
  const kpis = useMemo(() => {
    return {
      qtdCargas: filtradas.length,
      qtdPedidos: filtradas.reduce((s, c) => s + c.qtdPedidos, 0),
      pesoTotal: filtradas.reduce((s, c) => s + c.pesoTotal, 0),
      pesoRuptura: filtradas.reduce((s, c) => s + c.pesoRuptura, 0),
      qtdRupturas: filtradas.reduce((s, c) => s + c.qtdRupturas, 0),
    };
  }, [filtradas]);

  return (
    <Layout>
      <main className="container mx-auto p-4 sm:p-6 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5" /> Pré-cargas
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pedidos reservados em pré-cargas, com rupturas detalhadas. Faturamento pode editar pedidos sem desfazer a pré-carga.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar carga, placa, cliente, pedido..."
              className="pl-8 h-9"
            />
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiTile label="Pré-cargas" value={kpis.qtdCargas.toString()} />
          <KpiTile label="Pedidos" value={kpis.qtdPedidos.toString()} />
          <KpiTile label="Peso total" value={`${formatKg(kpis.pesoTotal)} kg`} />
          <KpiTile
            label="Em ruptura"
            value={`${formatKg(kpis.pesoRuptura)} kg`}
            sub={kpis.qtdRupturas > 0 ? `${kpis.qtdRupturas} item(ns)` : "—"}
            variant={kpis.pesoRuptura > 0 ? "destructive" : "default"}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : filtradas.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              {preCargas.length === 0
                ? "Nenhuma pré-carga no momento. Use \"Salvar pré-carga\" no fechamento para reservar pedidos."
                : "Nenhuma pré-carga corresponde à busca."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtradas.map((carga) => (
              <PreCargaCard
                key={carga.cargaId}
                carga={carga}
                onEditPedido={(p) => { setEditGrupo(p); setEditCargaCtx(carga); }}
              />
            ))}
          </div>
        )}

        <EditarPedidoAprovacaoDialog
          open={!!editGrupo}
          onOpenChange={(o) => { if (!o) { setEditGrupo(null); setEditCargaCtx(null); } }}
          grupo={editGrupo?.itens ?? null}
          preCargaContext={editCargaCtx ? {
            carga_id: editCargaCtx.cargaId,
            nome_carga: editCargaCtx.nomeCarga,
            placa: editCargaCtx.placa,
            motorista: editCargaCtx.motorista,
            transportadora: editCargaCtx.transportadora,
            tipo_caminhao: editCargaCtx.tipoCaminhao,
            ordem_carga: editCargaCtx.ordemCarga,
          } : null}
        />
      </main>
    </Layout>
  );
}

function KpiTile({ label, value, sub, variant }: { label: string; value: string; sub?: string; variant?: "default" | "destructive" }) {
  return (
    <Card className={cn(variant === "destructive" && "border-destructive/40 bg-destructive/5")}>
      <CardContent className="p-3">
        <div className={cn("text-[11px] uppercase tracking-wide", variant === "destructive" ? "text-destructive" : "text-muted-foreground")}>{label}</div>
        <div className={cn("text-lg sm:text-xl font-semibold tabular-nums mt-0.5", variant === "destructive" && "text-destructive")}>{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function PreCargaCard({ carga, onEditPedido }: { carga: PreCargaGrupo; onEditPedido: (p: PedidoGrupo) => void }) {
  const temRup = carga.pesoRuptura > 0;
  return (
    <Card className={cn(temRup && "border-destructive/30")}>
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <Package className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">{carga.nomeCarga || carga.cargaId}</span>
              <Badge variant="outline" className="text-[10px]">{formatDataBr(carga.data)}</Badge>
              <Badge variant="secondary" className="text-[10px]">{carga.qtdPedidos} pedidos</Badge>
              {temRup && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <AlertTriangle className="h-3 w-3" /> {carga.qtdRupturas} ruptura{carga.qtdRupturas === 1 ? "" : "s"} · {formatKg(carga.pesoRuptura)} kg
                </Badge>
              )}
            </CardTitle>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
              {carga.tipoCaminhao && <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{carga.tipoCaminhao}</span>}
              {(carga.placa || carga.motorista || carga.transportadora) && (
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{[carga.placa, carga.motorista, carga.transportadora].filter(Boolean).join(" · ")}</span>
              )}
              {carga.destinos && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{carga.destinos}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground">Peso total</div>
            <div className="text-base font-semibold tabular-nums">{formatKg(carga.pesoTotal)} kg</div>
            <div className="text-[11px] text-muted-foreground tabular-nums">
              {formatKg(carga.pesoEmbarcado)} kg embarcados
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <Accordion type="single" collapsible>
          <AccordionItem value="itens" className="border-b-0">
            <AccordionTrigger className="py-2 text-xs uppercase tracking-wide text-muted-foreground hover:no-underline">
              Pedidos e rupturas
            </AccordionTrigger>
            <AccordionContent>
              {/* Cabeçalho (≥ md) */}
              <div className="hidden md:grid grid-cols-[64px_minmax(0,1fr)_160px_120px_120px_92px] gap-3 px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                <div>Pedido</div>
                <div>Cliente</div>
                <div className="hidden lg:block">Cidade</div>
                <div className="text-right">Peso</div>
                <div className="text-right">Ruptura</div>
                <div></div>
              </div>
              <div className="divide-y">
                {carga.pedidos.map((p) => (
                  <PedidoRow key={p.numero_pedido} pedido={p} onEdit={() => onEditPedido(p)} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function PedidoRow({ pedido, onEdit }: { pedido: PedidoGrupo; onEdit: () => void }) {
  const [expand, setExpand] = useState(false);
  const temRup = pedido.qtdRupturas > 0;
  const rupturas = temRup ? pedido.itens.filter((it) => temRuptura(it)) : [];
  const rupturasMostrar = rupturas.slice(0, 3);
  const rupturasExtra = rupturas.length - rupturasMostrar.length;

  return (
    <div className={cn("rounded-md", temRup && "bg-destructive/5")}>
      {/* Linha principal: grid em md+, stack em mobile */}
      <button
        type="button"
        onClick={() => setExpand((v) => !v)}
        className={cn(
          "w-full text-left px-2 py-2 transition-colors",
          "hover:bg-muted/40",
          temRup && "hover:bg-destructive/10",
          "md:grid md:grid-cols-[64px_minmax(0,1fr)_160px_120px_120px_92px] md:gap-3 md:items-center",
          "flex flex-col gap-1"
        )}
      >
        {/* Pedido + cliente em mobile ficam na mesma linha */}
        <div className="flex items-center gap-2 md:block">
          <span className="font-mono text-xs text-muted-foreground">#{pedido.numero_pedido}</span>
        </div>

        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{pedido.cliente ?? "—"}</div>
          {pedido.codigo_cliente && (
            <div className="text-[11px] text-muted-foreground">Cód. {pedido.codigo_cliente}</div>
          )}
          {/* Cidade visível em mobile/md, escondida onde a coluna dedicada aparece */}
          <div className="text-[11px] text-muted-foreground lg:hidden">
            {pedido.cidade ? `${pedido.cidade}/${pedido.uf ?? ""}` : ""}
          </div>
        </div>

        <div className="hidden lg:block text-xs text-muted-foreground truncate">
          {pedido.cidade ? `${pedido.cidade}/${pedido.uf ?? ""}` : "—"}
        </div>

        <div className="flex md:block items-center justify-between md:text-right text-xs md:text-sm tabular-nums">
          <span className="md:hidden text-[11px] uppercase text-muted-foreground">Peso</span>
          <span>{formatKg(pedido.pesoEmbarcado)} kg</span>
        </div>

        <div className="flex md:block items-center justify-between md:text-right">
          <span className="md:hidden text-[11px] uppercase text-muted-foreground">Ruptura</span>
          {temRup ? (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertTriangle className="h-3 w-3" /> {formatKg(pedido.pesoRuptura)} kg
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        <div className="flex md:justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full md:w-auto" onClick={onEdit}>
            <Pencil className="h-3 w-3" /> Editar
          </Button>
        </div>
      </button>

      {/* Chips de ruptura: largura total, abaixo da linha */}
      {temRup && (
        <div className="px-2 pb-2 -mt-1 flex flex-wrap gap-1.5">
          {rupturasMostrar.map((it) => (
            <span
              key={it.id}
              className="inline-flex items-center gap-1 max-w-full rounded border border-destructive/30 bg-destructive/10 text-destructive px-1.5 py-0.5 text-[11px]"
              title={`${it.codigo_produto} ${it.nome_produto}${it.motivo_ruptura ? " · " + it.motivo_ruptura : ""}`}
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="font-mono shrink-0">{it.codigo_produto}</span>
              <span className="truncate max-w-[220px] sm:max-w-[280px] lg:max-w-[360px]">{it.nome_produto}</span>
              <span className="tabular-nums shrink-0">— {formatKg(pesoNaoCarregado(it))} kg</span>
            </span>
          ))}
          {rupturasExtra > 0 && (
            <span className="inline-flex items-center rounded border border-destructive/30 bg-destructive/10 text-destructive px-1.5 py-0.5 text-[11px]">
              +{rupturasExtra} item{rupturasExtra === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}

      {/* Expand: detalhe de todos os itens */}
      {expand && (
        <div className="bg-muted/30 px-3 py-3 rounded-b-md">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Itens do pedido</div>
          <div className="space-y-1">
            {pedido.itens.map((it) => {
              const rup = temRuptura(it);
              return (
                <div
                  key={it.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs",
                    rup ? "border-destructive/40 bg-destructive/5" : "bg-card"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] text-muted-foreground">{it.codigo_produto}</span>
                    <span className="truncate">{it.nome_produto}</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span>{(it.quantidade ?? 0).toLocaleString("pt-BR")} un</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{formatKg(it.peso ?? 0)} kg</span>
                    {rup && (
                      <Badge variant="destructive" className="text-[10px] gap-1 ml-1">
                        <AlertTriangle className="h-3 w-3" />
                        Ruptura{it.motivo_ruptura ? `: ${it.motivo_ruptura}` : ""}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}