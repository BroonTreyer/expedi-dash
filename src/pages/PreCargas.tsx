import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { usePreCargas, useAtualizarDataCarga, useRemoverPedidoPreCarga } from "@/hooks/usePreCargas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CalendarDays, FileDown, FileSpreadsheet, Package, Pencil, Search, Truck, MapPin, User, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { pesoEfetivo, pesoNaoCarregado, quantidadeNaoCarregada } from "@/lib/peso-utils";
import { isPorUnidade } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { EditarPedidoAprovacaoDialog } from "@/components/aprovacoes/EditarPedidoAprovacaoDialog";
import { PreCargaPrintDialog } from "@/components/precargas/PreCargaPrintDialog";
import { exportarPreCargaUnica, exportarPreCargasResumo } from "@/lib/pre-cargas-export";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
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
  unidRuptura: number;
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
  dataPrevista: string | null;
  pedidos: PedidoGrupo[];
  destinos: string;
  qtdPedidos: number;
  pesoTotal: number;
  pesoEmbarcado: number;
  pesoRuptura: number;
  unidRuptura: number;
  qtdRupturas: number;
}

function formatKg(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function formatUnid(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
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
  const { role } = useAuth();
  const canEditDate = role === "admin" || role === "faturamento" || role === "logistica";
  const canRemovePedido = role === "admin" || role === "faturamento" || role === "logistica";
  const [busca, setBusca] = useState("");
  const [editGrupo, setEditGrupo] = useState<PedidoGrupo | null>(null);
  const [editCargaCtx, setEditCargaCtx] = useState<PreCargaGrupo | null>(null);
  const [printCarga, setPrintCarga] = useState<PreCargaGrupo | null>(null);
  const [removerCtx, setRemoverCtx] = useState<{ carga: PreCargaGrupo; pedido: PedidoGrupo } | null>(null);
  const removerPedido = useRemoverPedidoPreCarga();

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
          dataPrevista: (r as any).data_prevista_carregamento ?? null,
          pedidos: [],
          destinos: "",
          qtdPedidos: 0,
          pesoTotal: 0,
          pesoEmbarcado: 0,
          pesoRuptura: 0,
          unidRuptura: 0,
          qtdRupturas: 0,
        };
        map.set(r.carga_id, g);
      }
    }
    // Group items into pedidos within each carga
    // Chave composta (numero_pedido + codigo_cliente|cliente) — mesmo numero
    // de pedido pode aparecer para clientes distintos na mesma carga.
    const pedidoBuckets = new Map<string, Map<string, PedidoGrupo>>();
    for (const r of rows as Item[]) {
      if (!r.carga_id || r.numero_pedido == null) continue;
      if (!pedidoBuckets.has(r.carga_id)) pedidoBuckets.set(r.carga_id, new Map());
      const peds = pedidoBuckets.get(r.carga_id)!;
      const pedKey = `${r.numero_pedido}::${r.codigo_cliente ?? r.cliente ?? ''}`;
      let p = peds.get(pedKey);
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
          unidRuptura: 0,
          qtdRupturas: 0,
        };
        peds.set(pedKey, p);
      }
      p.itens.push(r);
    }

    for (const [cargaId, peds] of pedidoBuckets) {
      const carga = map.get(cargaId);
      if (!carga) continue;
      const dest = new Set<string>();
      for (const p of peds.values()) {
        let pTot = 0, pEmb = 0, pRup = 0, pUnidRup = 0, qRup = 0;
        for (const it of p.itens) {
          const efet = pesoEfetivo(it);
          pEmb += efet;
          // Peso total continua sendo o "tamanho do pedido" (embarcado + o que faltou).
          // Para esse cálculo usamos pesoNaoCarregado (inclui parcial), pra não distorcer o peso planejado.
          pTot += efet + pesoNaoCarregado(it);
          // Mas o BLOCO de ruptura segue a mesma regra da tela Rupturas:
          // só conta ruptura TOTAL (ruptura === true) e separa kg vs. unidade.
          if (it.ruptura === true) {
            qRup += 1;
            if (isPorUnidade(it.nome_produto, it.codigo_produto)) {
              pUnidRup += quantidadeNaoCarregada(it);
            } else {
              pRup += pesoNaoCarregado(it);
            }
          }
        }
        p.pesoTotal = pTot;
        p.pesoEmbarcado = pEmb;
        p.pesoRuptura = pRup;
        p.unidRuptura = pUnidRup;
        p.qtdRupturas = qRup;
        carga.pedidos.push(p);
        if (p.cidade) dest.add(`${p.cidade}${p.uf ? "/" + p.uf : ""}`);
      }
      carga.pedidos.sort((a, b) =>
        a.numero_pedido - b.numero_pedido ||
        (a.cliente ?? '').localeCompare(b.cliente ?? '')
      );
      carga.qtdPedidos = carga.pedidos.length;
      carga.pesoEmbarcado = carga.pedidos.reduce((s, p) => s + p.pesoEmbarcado, 0);
      carga.pesoRuptura = carga.pedidos.reduce((s, p) => s + p.pesoRuptura, 0);
      carga.unidRuptura = carga.pedidos.reduce((s, p) => s + p.unidRuptura, 0);
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
      unidRuptura: filtradas.reduce((s, c) => s + c.unidRuptura, 0),
      qtdRupturas: filtradas.reduce((s, c) => s + c.qtdRupturas, 0),
    };
  }, [filtradas]);

  return (
    <Layout>
      <main className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 max-w-full">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 shrink-0" /> <span className="min-w-0 break-words">Pré-cargas</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pedidos reservados em pré-cargas, com rupturas detalhadas. Faturamento pode editar pedidos sem desfazer a pré-carga.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar carga, placa, cliente, pedido..."
                className="pl-8 h-10 sm:h-9"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-10 sm:h-9 gap-1 shrink-0 w-full sm:w-auto"
              disabled={filtradas.length === 0}
              onClick={() => exportarPreCargasResumo(filtradas)}
              title="Baixa um Excel com o resumo de todas as pré-cargas exibidas"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel resumo
            </Button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiTile label="Pré-cargas" value={kpis.qtdCargas.toString()} />
          <KpiTile label="Pedidos" value={kpis.qtdPedidos.toString()} />
          <KpiTile label="Peso total" value={`${formatKg(kpis.pesoTotal)} kg`} />
          <KpiTile
            label="Em ruptura"
            value={
              kpis.pesoRuptura > 0 || kpis.unidRuptura > 0
                ? `${formatKg(kpis.pesoRuptura)} kg${kpis.unidRuptura > 0 ? ` · ${formatUnid(kpis.unidRuptura)} unid` : ""}`
                : "—"
            }
            sub={kpis.qtdRupturas > 0 ? `${kpis.qtdRupturas} item(ns)` : "—"}
            variant={kpis.pesoRuptura > 0 || kpis.unidRuptura > 0 ? "destructive" : "default"}
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
                canEditDate={canEditDate}
                canRemovePedido={canRemovePedido}
                onEditPedido={(p) => { setEditGrupo(p); setEditCargaCtx(carga); }}
                onRemovePedido={(p) => setRemoverCtx({ carga, pedido: p })}
                onPrint={() => setPrintCarga(carga)}
                onExportXlsx={() => exportarPreCargaUnica(carga)}
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
        <PreCargaPrintDialog
          open={!!printCarga}
          onOpenChange={(o) => { if (!o) setPrintCarga(null); }}
          carga={printCarga}
        />
        <DeleteConfirmDialog
          open={!!removerCtx}
          onOpenChange={(o) => { if (!o) setRemoverCtx(null); }}
          title="Remover pedido da pré-carga?"
          description={
            removerCtx
              ? `Remover o pedido #${removerCtx.pedido.numero_pedido}${removerCtx.pedido.cliente ? ` (${removerCtx.pedido.cliente})` : ""} da pré-carga "${removerCtx.carga.nomeCarga || removerCtx.carga.cargaId}"? Ele voltará para "Aguardando faturamento" e poderá ser incluído em outra carga.`
              : ""
          }
          confirmLabel="Remover"
          onConfirm={() => {
            if (!removerCtx) return;
            const { carga, pedido } = removerCtx;
            removerPedido.mutate(
              {
                cargaId: carga.cargaId,
                numeroPedido: pedido.numero_pedido,
                codigoCliente: pedido.codigo_cliente,
                cliente: pedido.cliente,
              },
              {
                onSuccess: () => {
                  toast.success(`Pedido #${pedido.numero_pedido} removido da pré-carga`);
                  setRemoverCtx(null);
                },
                onError: (e: any) => toast.error("Não foi possível remover o pedido", { description: e?.message }),
              },
            );
          }}
        />
      </main>
    </Layout>
  );
}

function KpiTile({ label, value, sub, variant }: { label: string; value: string; sub?: string; variant?: "default" | "destructive" }) {
  return (
    <Card className={cn("min-w-0", variant === "destructive" && "border-destructive/40 bg-destructive/5")}>
      <CardContent className="p-3 min-w-0">
        <div className={cn("text-[11px] uppercase tracking-wide truncate", variant === "destructive" ? "text-destructive" : "text-muted-foreground")}>{label}</div>
        <div className={cn("text-base sm:text-xl font-semibold tabular-nums mt-0.5 break-words leading-tight", variant === "destructive" && "text-destructive")}>{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function PreCargaCard({ carga, canEditDate, canRemovePedido, onEditPedido, onRemovePedido, onPrint, onExportXlsx }: { carga: PreCargaGrupo; canEditDate: boolean; canRemovePedido: boolean; onEditPedido: (p: PedidoGrupo) => void; onRemovePedido: (p: PedidoGrupo) => void; onPrint: () => void; onExportXlsx: () => void }) {
  const temRup = carga.pesoRuptura > 0 || carga.unidRuptura > 0;
  // "Data prevista de carregamento" é controle interno do Faturamento.
  // Não afeta filtros nem painéis. Fallback para `data` quando ainda não preenchida.
  const dataExibida = carga.dataPrevista ?? carga.data;
  const [dataLocal, setDataLocal] = useState(dataExibida);
  useEffect(() => { setDataLocal(dataExibida); }, [dataExibida]);
  const atualizarData = useAtualizarDataCarga();

  const commitData = (nova: string) => {
    if (!nova || nova === dataExibida) return;
    const anterior = dataExibida;
    setDataLocal(nova);
    atualizarData.mutate(
      { cargaId: carga.cargaId, novaData: nova },
      {
        onSuccess: () => toast.success(`Data atualizada para ${formatDataBr(nova)}`),
        onError: (e: any) => {
          setDataLocal(anterior);
          toast.error("Não foi possível atualizar a data", { description: e?.message });
        },
      },
    );
  };
  return (
    <Card className={cn(temRup && "border-destructive/30")}>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base flex items-start gap-2 min-w-0">
              <Package className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span className="min-w-0 break-words leading-tight">{carga.nomeCarga || carga.cargaId}</span>
              <Badge variant="secondary" className="text-[10px] shrink-0 self-center">{carga.qtdPedidos} pedidos</Badge>
            </CardTitle>
            {temRup && (
              <div className="mt-2">
                <Badge variant="destructive" className="text-[10px] gap-1 whitespace-normal text-left h-auto py-1 leading-snug max-w-full">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span className="break-words">
                    {carga.qtdRupturas} ruptura{carga.qtdRupturas === 1 ? "" : "s"} · {formatKg(carga.pesoRuptura)} kg{carga.unidRuptura > 0 ? ` · ${formatUnid(carga.unidRuptura)} unid` : ""}
                  </span>
                </Badge>
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-1.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 sm:flex-wrap">
              {carga.tipoCaminhao && <span className="flex items-center gap-1 min-w-0"><Truck className="h-3 w-3 shrink-0" /><span className="truncate">{carga.tipoCaminhao}</span></span>}
              {(carga.placa || carga.motorista || carga.transportadora) && (
                <span className="flex items-start gap-1 min-w-0"><User className="h-3 w-3 shrink-0 mt-0.5" /><span className="break-words">{[carga.placa, carga.motorista, carga.transportadora].filter(Boolean).join(" · ")}</span></span>
              )}
            </div>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1 sm:text-right sm:shrink-0 border-t sm:border-0 border-border/60 pt-2 sm:pt-0">
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs text-muted-foreground">Peso total</div>
              <div className="text-base font-semibold tabular-nums leading-tight">{formatKg(carga.pesoTotal)} kg</div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {formatKg(carga.pesoEmbarcado)} kg embarcados
              </div>
            </div>
            <div className="flex items-center gap-1 sm:mt-1.5 shrink-0">
              <Button size="sm" variant="outline" className="h-9 sm:h-7 text-xs gap-1" onClick={onPrint}>
                <FileDown className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button size="sm" variant="outline" className="h-9 sm:h-7 text-xs gap-1" onClick={onExportXlsx}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      {/* Data do Carregamento — destaque para o Faturamento */}
      <div
        className="mx-3 sm:mx-4 mt-1 mb-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
      >
        <div className="flex items-center gap-2 text-sm font-semibold shrink-0">
          <CalendarDays className="h-4 w-4 text-primary" />
          Data do Carregamento
        </div>
        {canEditDate ? (
          <Input
            type="date"
            value={dataLocal}
            onChange={(e) => setDataLocal(e.target.value)}
            onBlur={(e) => commitData(e.target.value)}
            disabled={atualizarData.isPending}
            className="h-10 sm:h-9 w-full sm:w-auto text-sm font-semibold"
          />
        ) : (
          <span className="text-sm font-semibold tabular-nums">{formatDataBr(dataLocal)}</span>
        )}
        <span className="text-[11px] text-muted-foreground leading-snug">
          {canEditDate
            ? "Controle interno do Faturamento — não afeta filtros nem painéis do sistema."
            : "Controle interno do Faturamento."}
        </span>
      </div>
      {carga.destinos && (
        <div className="px-3 sm:px-4 py-2 border-t border-border/50 bg-muted/30 text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="flex-1 min-w-0 break-words">{carga.destinos}</span>
        </div>
      )}
      <CardContent className="p-3 sm:p-4 pt-2">
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
                  <PedidoRow
                    key={`${p.numero_pedido}-${p.codigo_cliente ?? p.cliente ?? ''}`}
                    pedido={p}
                    onEdit={() => onEditPedido(p)}
                    onRemove={canRemovePedido ? () => onRemovePedido(p) : undefined}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function PedidoRow({ pedido, onEdit, onRemove }: { pedido: PedidoGrupo; onEdit: () => void; onRemove?: () => void }) {
  const [expand, setExpand] = useState(false);
  const temRup = pedido.qtdRupturas > 0;
  const rupturas = temRup ? pedido.itens.filter((it) => it.ruptura === true) : [];

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
              <AlertTriangle className="h-3 w-3" />
              {pedido.pesoRuptura > 0 && <span>{formatKg(pedido.pesoRuptura)} kg</span>}
              {pedido.pesoRuptura > 0 && pedido.unidRuptura > 0 && <span>·</span>}
              {pedido.unidRuptura > 0 && <span>{formatUnid(pedido.unidRuptura)} unid</span>}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        <div className="flex md:justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1 md:flex-none" onClick={onEdit}>
            <Pencil className="h-3 w-3" /> Editar
          </Button>
          {onRemove && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onRemove}
              title="Remover pedido da pré-carga"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </button>

      {/* Chips de ruptura: largura total, abaixo da linha */}
      {temRup && (
        <div className="px-2 pb-2 -mt-1 flex flex-wrap gap-1.5">
          {rupturas.map((it) => (
            <span
              key={it.id}
              className="inline-flex items-center gap-1 max-w-full rounded border border-destructive/30 bg-destructive/10 text-destructive px-1.5 py-0.5 text-[11px]"
              title={`${it.codigo_produto} ${it.nome_produto}${it.motivo_ruptura ? " · " + it.motivo_ruptura : ""}`}
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="font-mono shrink-0">{it.codigo_produto}</span>
              <span className="truncate max-w-[220px] sm:max-w-[280px] lg:max-w-[360px]">{it.nome_produto}</span>
              <span className="tabular-nums shrink-0">
                {isPorUnidade(it.nome_produto, it.codigo_produto)
                  ? `— ${formatUnid(quantidadeNaoCarregada(it))} unid`
                  : `— ${formatKg(pesoNaoCarregado(it))} kg`}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Expand: detalhe de todos os itens */}
      {expand && (
        <div className="bg-muted/30 px-3 py-3 rounded-b-md">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Itens do pedido</div>
          <div className="space-y-1">
            {pedido.itens.map((it) => {
              const rup = it.ruptura === true;
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