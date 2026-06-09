import { useState, useMemo, useCallback, useEffect, Fragment } from "react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { CarregamentoDialog, type DialogMode } from "@/components/dashboard/CarregamentoDialog";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import {
  useCarregamentos,
  useCreateCarregamento,
  useUpdateCarregamento,
  useDeleteCarregamento,
  useBatchCreateCarregamento,
  type Carregamento,
} from "@/hooks/useCarregamentos";
import { useVendedores } from "@/hooks/useVendedores";
import { useTiposCaminhao } from "@/hooks/useTiposCaminhao";
import { useProdutos } from "@/hooks/useProdutos";
import { useClientes } from "@/hooks/useClientes";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Weight,
  Plus,
  Printer,
  Download,
  PackageX,
  Package,
  ChevronLeft,
  ChevronRight,
  History,
  Activity,
  RefreshCw,
} from "lucide-react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { isPorUnidade } from "@/lib/constants";
import { pesoNaoCarregado, quantidadeNaoCarregada } from "@/lib/peso-utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RupturasPrintDialog, type RupturasPrintData } from "@/components/dashboard/RupturasPrintDialog";
import { cn } from "@/lib/utils";
import { RupturasErrorBoundary } from "@/components/RupturasErrorBoundary";

function getToday() { return new Date().toISOString().split("T")[0]; }
function fmtKg(n: number) { return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 }); }
function fmtTon(kg: number) { return (kg / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function fmtUnid(n: number) { return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 }); }

/* =================================================================== */
/*                              KPI CARD                                */
/* =================================================================== */
interface KpiProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "amber" | "rose" | "slate";
}
function Kpi({ icon, label, value, sub, tone = "amber" }: KpiProps) {
  const toneCls =
    tone === "rose"
      ? "border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300"
      : tone === "slate"
      ? "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
      : "border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300";
  return (
    <Card className={cn("min-h-[88px]", toneCls)}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="shrink-0 opacity-80">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight truncate">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function exportCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(cell => {
    const s = String(cell ?? "");
    if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ProdAgg {
  codigo: string;
  nome: string;
  qtdPedidos: number;
  pesoCortado: number;
  qtdCortada: number;
  porUnidade: boolean;
  cargas: Set<string>;
  clientes: Set<string>;
  ultimaData?: string;
  items?: Carregamento[];
}

/* =================================================================== */
/*                  ABA 1 — FALTANDO AGORA (ao vivo)                    */
/* =================================================================== */

interface AtualProps {
  canEdit: boolean;
  onNovo: () => void;
}

function FaltandoAgora({ canEdit, onNovo }: AtualProps) {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  // Espelha exatamente o Painel principal: hoje + carry-over de pedidos não finalizados.
  // Passar a mesma data em from/to ativa a regra especial do hook (carry-over 30d, status != 'Carregado').
  // Estabiliza 'today' por render-cycle para não invalidar useMemo abaixo.
  const today = useMemo(() => new Date(), []);
  const todayStr = format(today, "yyyy-MM-dd");
  const { data: carregamentos = [], isLoading, dataUpdatedAt, refetch } = useCarregamentos(todayStr, todayStr);
  const [cargaFilter, setCargaFilter] = useState(() => searchParams.get("carga") || "todos");
  const [busca, setBusca] = useState("");
  const [printOpen, setPrintOpen] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Rede de segurança: realtime é o canal primário, mas se cair (aba em background,
  // sleep, wifi instável) os dados ficam parados. Aqui forçamos refetch:
  // (1) a cada 20s enquanto a aba estiver visível,
  // (2) ao voltar foco da aba,
  // (3) quando a internet voltar.
  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["carregamentos"] });
    };
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") invalidate();
    }, 20_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") invalidate();
    };
    const onOnline = () => invalidate();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [queryClient]);

  // Tick para re-renderizar o "Atualizado há Xs" sem refetch.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 5_000);
    return () => window.clearInterval(t);
  }, []);
  const segundosAtras = Math.max(0, Math.floor((Date.now() - (dataUpdatedAt || Date.now())) / 1000));
  const atualizadoLabel =
    segundosAtras < 5 ? "agora" :
    segundosAtras < 60 ? `há ${segundosAtras}s` :
    `há ${Math.floor(segundosAtras / 60)}min`;

  // Ruptura aberta enquanto o item NÃO foi efetivamente carregado.
  // Antes excluíamos `etapa === "logistica"`, o que fazia a ruptura sumir
  // assim que a pré-carga era fechada (virava etapa logística). Agora só
  // saem da lista os itens realmente concluídos no portão (status Carregado).
  const todasRupturas = useMemo(
    () =>
      carregamentos.filter((c) => {
        if (c.ruptura !== true) return false;
        if (c.carga_id != null && c.status === "Carregado") return false;
        return true;
      }),
    [carregamentos]
  );

  const rupturas = useMemo(() => {
    return todasRupturas.filter((c) => {
      if (cargaFilter !== "todos" && c.nome_carga !== cargaFilter) return false;
      if (busca) {
        const b = busca.toLowerCase();
        if (
          !c.nome_produto?.toLowerCase().includes(b) &&
          !c.codigo_produto?.toLowerCase().includes(b) &&
          !c.nome_carga?.toLowerCase().includes(b)
        ) return false;
      }
      return true;
    });
  }, [todasRupturas, cargaFilter, busca]);

  const rupturaCargas = useMemo(
    () => [...new Set(todasRupturas.filter(c => c.nome_carga).map(c => c.nome_carga!))].sort(),
    [todasRupturas]
  );

  const productSummary = useMemo<ProdAgg[]>(() => {
    const map = new Map<string, ProdAgg>();
    for (const c of rupturas) {
      const key = c.codigo_produto || c.nome_produto || "SEM_COD";
      // "Faltando agora" usa peso_original como referência do que foi cortado.
      // Mesma fonte de verdade do Painel e do Histórico (pesoNaoCarregado).
      const perdido = pesoNaoCarregado(c);
      const porUnid = isPorUnidade(c.nome_produto);
      let g = map.get(key);
      if (!g) {
        g = {
          codigo: c.codigo_produto || "—",
          nome: c.nome_produto || "—",
          qtdPedidos: 0, pesoCortado: 0, qtdCortada: 0,
          porUnidade: porUnid, cargas: new Set(), clientes: new Set(),
          items: [],
        };
        map.set(key, g);
      }
      g.qtdPedidos += 1;
      g.pesoCortado += perdido;
      // Quantidade segue a mesma regra que peso (helper unificado).
      // Blinda contra `quantidade_original` corrompido (< quantidade) — devolve 0 nesses casos.
      g.qtdCortada += quantidadeNaoCarregada(c);
      if (c.nome_carga) g.cargas.add(c.nome_carga);
      if (c.codigo_cliente) g.clientes.add(c.codigo_cliente);
      g.items!.push(c);
    }
    const arr = [...map.values()];
    for (const g of arr) {
      g.items!.sort((a, b) => {
        const va = g.porUnidade ? quantidadeNaoCarregada(a) : pesoNaoCarregado(a);
        const vb = g.porUnidade ? quantidadeNaoCarregada(b) : pesoNaoCarregado(b);
        return vb - va;
      });
    }
    return arr.sort((a, b) => {
      const va = a.porUnidade ? a.qtdCortada : a.pesoCortado;
      const vb = b.porUnidade ? b.qtdCortada : b.pesoCortado;
      return vb - va;
    });
  }, [rupturas]);

  const kpis = useMemo(() => {
    let pesoTotal = 0;
    let unidTotal = 0;
    for (const p of productSummary) {
      if (p.porUnidade) unidTotal += p.qtdCortada;
      else pesoTotal += p.pesoCortado;
    }
    // Conta pedidos únicos por operation_id (quando disponível) — evita inflar o
    // contador quando há linhas duplicadas para o mesmo (operation_id, numero_pedido).
    const pedidosUnicos = new Set(
      rupturas
        .map((c: any) => c.operation_id ?? (c.numero_pedido != null ? `np-${c.numero_pedido}` : null))
        .filter((k): k is string => !!k)
    ).size;
    return { pesoTotal, unidTotal, itens: rupturas.length, pedidos: pedidosUnicos };
  }, [productSummary, rupturas]);

  const printData = useMemo<RupturasPrintData | null>(() => {
    if (rupturas.length === 0) return null;
    return {
      data: format(today, "dd/MM/yyyy"),
      totalRupturas: rupturas.length,
      totalPeso: kpis.pesoTotal,
      productSummary: productSummary.map(p => ({
        codigo: p.codigo, nome: p.nome, count: p.qtdPedidos,
        peso: p.pesoCortado, qtd: p.qtdCortada, porUnidade: p.porUnidade, cargas: p.cargas,
      })),
      items: rupturas.map((c) => ({
        id: c.id, numero_pedido: c.numero_pedido, nome_produto: c.nome_produto,
        codigo_produto: c.codigo_produto, cliente: c.cliente, codigo_cliente: c.codigo_cliente,
        peso: c.peso, peso_original: c.peso_original, ruptura: c.ruptura,
      })),
    };
  }, [rupturas, kpis.pesoTotal, productSummary, today]);

  const handleExportCsv = () => {
    const rows: (string | number)[][] = [["Código","Produto","Faltando","Unidade","Pedidos","Clientes","Cargas"]];
    for (const p of productSummary) {
      rows.push([
        p.codigo, p.nome,
        p.porUnidade ? p.qtdCortada : p.pesoCortado,
        p.porUnidade ? "UNID" : "kg",
        p.qtdPedidos, p.clientes.size, [...p.cargas].join(" | "),
      ]);
    }
    exportCsv(`faltando_agora_${format(today, "dd-MM-yyyy")}.csv`, rows);
  };

  const renderCargas = (cargas: Set<string>) => {
    const arr = [...cargas];
    if (arr.length === 0) return <span className="text-muted-foreground">—</span>;
    const visible = arr.slice(0, 3).join(", ");
    const extra = arr.length - 3;
    return <span>{visible}{extra > 0 && <span className="text-muted-foreground"> +{extra}</span>}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Itens marcados como ruptura total ainda em aberto — inclui pedidos arrastados dos últimos 30 dias que ainda não foram marcados como <strong>Carregado</strong>. A lista atualiza automaticamente quando alguém marca ou resolve uma ruptura.
          </p>
          <p className="text-[11px] text-muted-foreground/80 inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Atualizado {atualizadoLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            title="Atualizar agora"
            className="h-9 w-9 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {productSummary.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Exportar CSV</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPrintOpen(true)}>
                <Printer className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Imprimir</span>
              </Button>
            </>
          )}
          {canEdit && (
            <Button size="sm" onClick={onNovo}>
              <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Novo Pedido (Ruptura)</span><span className="sm:hidden">Nova</span>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <Select value={cargaFilter} onValueChange={setCargaFilter}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Carga" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as cargas</SelectItem>
                {rupturaCargas.map((nc) => <SelectItem key={nc} value={nc}>{nc}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Buscar produto ou carga..." value={busca} onChange={(e) => setBusca(e.target.value)} className="h-9 text-sm" />
          </div>
          {(cargaFilter !== "todos" || busca) && (
            <div className="mt-2 flex justify-end">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setCargaFilter("todos"); setBusca(""); }}>Limpar filtros</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Kpi icon={<PackageX className="h-6 w-6" />} label="Itens em ruptura agora" value={kpis.itens}
          sub={`em ${kpis.pedidos} pedido(s) · ${productSummary.length} produto(s) distinto(s)`} tone="rose" />
        <Kpi icon={<Weight className="h-6 w-6" />} label="Faltando agora"
          value={
            <>
              {kpis.pesoTotal > 0 && <>{fmtTon(kpis.pesoTotal)} TON</>}
              {kpis.pesoTotal > 0 && kpis.unidTotal > 0 && <span className="mx-1.5 text-muted-foreground">·</span>}
              {kpis.unidTotal > 0 && <>{fmtUnid(kpis.unidTotal)} UNID</>}
              {kpis.pesoTotal === 0 && kpis.unidTotal === 0 && <>—</>}
            </>
          }
          sub={kpis.pesoTotal > 0 ? `${fmtKg(kpis.pesoTotal)} kg em peso` : "sem peso registrado"} />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando dados...</div>
      ) : productSummary.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">Nenhum produto em ruptura no momento</p>
            <p className="text-xs text-muted-foreground mt-1">Tudo certo por aqui.</p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-2">
          {productSummary.map((p) => {
            const key = p.codigo + p.nome;
            const open = expandido === key;
            return (
              <Card key={key} className="border-l-4 border-l-rose-500">
                <CardContent className="p-3 space-y-2">
                  <div>
                    <p className="text-[11px] font-mono text-muted-foreground">{p.codigo}</p>
                    <p className="text-base font-semibold leading-tight">{p.nome}</p>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                      {p.porUnidade ? fmtUnid(p.qtdCortada) : fmtKg(p.pesoCortado)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">{p.porUnidade ? "UNID" : "kg"}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.qtdPedidos} pedido{p.qtdPedidos > 1 ? "s" : ""} · {p.clientes.size} cliente{p.clientes.size > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">Cargas: {renderCargas(p.cargas)}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs justify-center gap-1"
                    onClick={() => setExpandido(open ? null : key)}
                  >
                    {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {open ? "Ocultar" : `Ver clientes (${p.items?.length ?? 0})`}
                  </Button>
                  {open && (
                    <div className="space-y-1.5 pt-1">
                      {p.items?.map((c) => {
                        const falt = p.porUnidade ? quantidadeNaoCarregada(c) : pesoNaoCarregado(c);
                        return (
                          <div key={c.id} className="rounded-md border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 p-2 text-xs space-y-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{c.cliente ?? "—"}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  {c.codigo_cliente ?? "—"} · {c.cidade ?? "—"}/{c.uf ?? "—"}
                                </p>
                              </div>
                              <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400 shrink-0">
                                {p.porUnidade ? fmtUnid(falt) : fmtKg(falt)} <span className="text-[10px] font-normal text-muted-foreground">{p.porUnidade ? "UNID" : "kg"}</span>
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Pedido #{c.numero_pedido ?? "—"} · Carga {c.nome_carga ?? "—"}
                              {c.vendedor ? ` · ${c.vendedor}` : ""}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-[42%]">Produto</TableHead>
                  <TableHead className="text-right w-[18%]">Faltando</TableHead>
                  <TableHead className="text-center w-[10%]">Pedidos</TableHead>
                  <TableHead className="text-center w-[10%]">Clientes</TableHead>
                  <TableHead className="w-[17%]">Cargas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productSummary.map((p) => {
                  const key = p.codigo + p.nome;
                  const open = expandido === key;
                  return (
                    <Fragment key={key}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setExpandido(open ? null : key)}
                      >
                        <TableCell className="pr-0">
                          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell>
                          <p className="text-[11px] font-mono text-muted-foreground">{p.codigo}</p>
                          <p className="text-sm font-semibold leading-tight">{p.nome}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-base font-bold tabular-nums text-rose-600 dark:text-rose-400">
                            {p.porUnidade ? fmtUnid(p.qtdCortada) : fmtKg(p.pesoCortado)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">{p.porUnidade ? "UNID" : "kg"}</span>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{p.qtdPedidos}</TableCell>
                        <TableCell className="text-center tabular-nums">{p.clientes.size}</TableCell>
                        <TableCell className="text-xs">{renderCargas(p.cargas)}</TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/30">
                          <TableCell colSpan={6} className="p-0">
                            <div className="px-4 py-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                                Clientes com este produto em ruptura
                              </p>
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="h-8 text-[11px]">Cliente</TableHead>
                                    <TableHead className="h-8 text-[11px]">Cidade/UF</TableHead>
                                    <TableHead className="h-8 text-[11px]">Pedido</TableHead>
                                    <TableHead className="h-8 text-[11px]">Carga</TableHead>
                                    <TableHead className="h-8 text-[11px]">Vendedor</TableHead>
                                    <TableHead className="h-8 text-[11px] text-right">Faltando</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {p.items?.map((c) => {
                                    const falt = p.porUnidade ? quantidadeNaoCarregada(c) : pesoNaoCarregado(c);
                                    return (
                                      <TableRow key={c.id} className="hover:bg-rose-100/30 dark:hover:bg-rose-900/20">
                                        <TableCell className="py-1.5 text-xs">
                                          <span className="font-medium">{c.cliente ?? "—"}</span>
                                          <span className="ml-1 text-[10px] font-mono text-muted-foreground">{c.codigo_cliente ?? ""}</span>
                                        </TableCell>
                                        <TableCell className="py-1.5 text-xs">{c.cidade ?? "—"}/{c.uf ?? "—"}</TableCell>
                                        <TableCell className="py-1.5 text-xs tabular-nums">#{c.numero_pedido ?? "—"}</TableCell>
                                        <TableCell className="py-1.5 text-xs">{c.nome_carga ?? "—"}</TableCell>
                                        <TableCell className="py-1.5 text-xs text-muted-foreground">{c.vendedor ?? "—"}</TableCell>
                                        <TableCell className="py-1.5 text-xs text-right">
                                          <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                                            {p.porUnidade ? fmtUnid(falt) : fmtKg(falt)}
                                          </span>
                                          <span className="ml-1 text-[10px] text-muted-foreground">{p.porUnidade ? "UNID" : "kg"}</span>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <RupturasPrintDialog open={printOpen} onOpenChange={setPrintOpen} data={printData} />
    </div>
  );
}

/* =================================================================== */
/*                  ABA 2 — HISTÓRICO DO MÊS (acumulado)                */
/* =================================================================== */

function HistoricoMes() {
  const [mesRef, setMesRef] = useState(() => startOfMonth(new Date()));
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const dateFromStr = format(startOfMonth(mesRef), "yyyy-MM-dd");
  const dateToStr = format(endOfMonth(mesRef), "yyyy-MM-dd");

  const { data: carregamentos = [], isLoading } = useCarregamentos(dateFromStr, dateToStr);

  // Conta TODO evento de ruptura no mês: ruptura total OU sinalizada OU peso < peso_original
  const eventos = useMemo(() => {
    return carregamentos.filter((c) => {
      if (c.ruptura) return true;
      if ((c as any).ruptura_sinalizada) return true;
      const orig = c.peso_original ?? 0;
      const atual = c.peso ?? 0;
      return orig > 0 && atual < orig;
    });
  }, [carregamentos]);

  const eventosFiltrados = useMemo(() => {
    if (!busca) return eventos;
    const b = busca.toLowerCase();
    return eventos.filter(c =>
      c.nome_produto?.toLowerCase().includes(b) ||
      c.codigo_produto?.toLowerCase().includes(b) ||
      c.cliente?.toLowerCase().includes(b)
    );
  }, [eventos, busca]);

  const productSummary = useMemo<ProdAgg[]>(() => {
    const map = new Map<string, ProdAgg>();
    for (const c of eventosFiltrados) {
      const key = c.codigo_produto || c.nome_produto || "SEM_COD";
      const perdido = pesoNaoCarregado(c);
      const porUnid = isPorUnidade(c.nome_produto);
      let g = map.get(key);
      if (!g) {
        g = {
          codigo: c.codigo_produto || "—",
          nome: c.nome_produto || "—",
          qtdPedidos: 0, pesoCortado: 0, qtdCortada: 0,
          porUnidade: porUnid, cargas: new Set(), clientes: new Set(),
        };
        map.set(key, g);
      }
      g.qtdPedidos += 1;
      g.pesoCortado += perdido;
      g.qtdCortada += quantidadeNaoCarregada(c);
      if (c.nome_carga) g.cargas.add(c.nome_carga);
      if (c.codigo_cliente) g.clientes.add(c.codigo_cliente);
      if (!g.ultimaData || (c.data && c.data > g.ultimaData)) g.ultimaData = c.data;
    }
    return [...map.values()].sort((a, b) => {
      const va = a.porUnidade ? a.qtdCortada : a.pesoCortado;
      const vb = b.porUnidade ? b.qtdCortada : b.pesoCortado;
      return vb - va;
    });
  }, [eventosFiltrados]);

  const kpis = useMemo(() => {
    let pesoTotal = 0, unidTotal = 0;
    for (const p of productSummary) {
      if (p.porUnidade) unidTotal += p.qtdCortada;
      else pesoTotal += p.pesoCortado;
    }
    // Produto crítico
    const critico = productSummary[0];
    // Cliente mais impactado
    const porCliente = new Map<string, number>();
    for (const c of eventosFiltrados) {
      const k = c.cliente || c.codigo_cliente || "—";
      porCliente.set(k, (porCliente.get(k) || 0) + pesoNaoCarregado(c));
    }
    let clienteTop: { nome: string; peso: number } | null = null;
    for (const [nome, peso] of porCliente) {
      if (!clienteTop || peso > clienteTop.peso) clienteTop = { nome, peso };
    }
    return {
      eventos: eventosFiltrados.length,
      pesoTotal, unidTotal,
      critico, clienteTop,
    };
  }, [productSummary, eventosFiltrados]);

  const handleExportCsv = () => {
    const rows: (string | number)[][] = [["Código","Produto","Ocorrências","Faltado","Unidade","Clientes afetados","Última ocorrência"]];
    for (const p of productSummary) {
      rows.push([
        p.codigo, p.nome, p.qtdPedidos,
        p.porUnidade ? p.qtdCortada : p.pesoCortado,
        p.porUnidade ? "UNID" : "kg",
        p.clientes.size,
        p.ultimaData ? format(new Date(p.ultimaData + "T00:00:00"), "dd/MM/yyyy") : "—",
      ]);
    }
    exportCsv(`historico_rupturas_${format(mesRef, "yyyy-MM")}.csv`, rows);
  };

  const isMesAtual = format(mesRef, "yyyy-MM") === format(new Date(), "yyyy-MM");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setMesRef(subMonths(mesRef, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] text-center">
            <p className="text-xs text-muted-foreground">Mês de referência</p>
            <p className="text-base font-semibold capitalize">{format(mesRef, "MMMM 'de' yyyy", { locale: ptBR })}</p>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setMesRef(addMonths(mesRef, 1))} disabled={isMesAtual}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {productSummary.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground">
        Acumulado de tudo que faltou no mês selecionado, agrupado por produto. Mesmo itens que já foram repostos continuam contabilizados aqui.
      </p>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <Input placeholder="Buscar produto ou cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} className="h-9 text-sm" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<History className="h-6 w-6" />} label="Eventos de ruptura" value={kpis.eventos}
          sub={`${productSummary.length} produto(s) distinto(s)`} tone="amber" />
        <Kpi icon={<Weight className="h-6 w-6" />} label="Faltado no mês"
          value={
            <>
              {kpis.pesoTotal > 0 && <>{fmtTon(kpis.pesoTotal)} TON</>}
              {kpis.pesoTotal > 0 && kpis.unidTotal > 0 && <span className="mx-1.5 text-muted-foreground">·</span>}
              {kpis.unidTotal > 0 && <>{fmtUnid(kpis.unidTotal)} UNID</>}
              {kpis.pesoTotal === 0 && kpis.unidTotal === 0 && <>—</>}
            </>
          }
          sub={kpis.pesoTotal > 0 ? `${fmtKg(kpis.pesoTotal)} kg acumulados` : "sem peso registrado"}
          tone="rose" />
        <Kpi icon={<PackageX className="h-6 w-6" />} label="Produto mais crítico"
          value={kpis.critico ? <span className="text-base">{kpis.critico.nome}</span> : "—"}
          sub={kpis.critico ? `${kpis.critico.porUnidade ? fmtUnid(kpis.critico.qtdCortada) + " UNID" : fmtKg(kpis.critico.pesoCortado) + " kg"}` : undefined}
          tone="slate" />
        <Kpi icon={<AlertTriangle className="h-6 w-6" />} label="Cliente mais impactado"
          value={kpis.clienteTop ? <span className="text-base">{kpis.clienteTop.nome}</span> : "—"}
          sub={kpis.clienteTop ? `${fmtKg(kpis.clienteTop.peso)} kg faltado` : undefined}
          tone="slate" />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando dados...</div>
      ) : productSummary.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">Nenhuma ruptura registrada neste mês</p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-2">
          {productSummary.map((p) => {
            const key = p.codigo + p.nome;
            const aberto = expandido === key;
            const detalhes = aberto ? eventosFiltrados.filter(c => (c.codigo_produto || c.nome_produto || "SEM_COD") === (p.codigo === "—" ? p.nome : p.codigo)) : [];
            return (
              <Card key={key} className="border-l-4 border-l-rose-500">
                <CardContent className="p-3 space-y-2">
                  <button className="w-full text-left" onClick={() => setExpandido(aberto ? null : key)}>
                    <p className="text-[11px] font-mono text-muted-foreground">{p.codigo}</p>
                    <p className="text-base font-semibold leading-tight">{p.nome}</p>
                    <div className="flex items-baseline justify-between gap-2 mt-1">
                      <span className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        {p.porUnidade ? fmtUnid(p.qtdCortada) : fmtKg(p.pesoCortado)}
                        <span className="text-sm font-normal text-muted-foreground ml-1">{p.porUnidade ? "UNID" : "kg"}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {p.qtdPedidos} ocorrência{p.qtdPedidos > 1 ? "s" : ""} · {p.clientes.size} cliente{p.clientes.size > 1 ? "s" : ""}
                      </span>
                    </div>
                  </button>
                  {aberto && detalhes.length > 0 && (
                    <div className="border-t pt-2 space-y-1">
                      {detalhes.map(d => (
                        <div key={d.id} className="text-xs flex justify-between gap-2">
                          <span className="truncate">
                            {d.data && format(new Date(d.data + "T00:00:00"), "dd/MM")} — {d.cliente || "—"}
                          </span>
                          <span className="tabular-nums text-rose-600 dark:text-rose-400 shrink-0">
                            {fmtKg(pesoNaoCarregado(d))} kg
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Produto</TableHead>
                  <TableHead className="text-right w-[15%]">Faltado total</TableHead>
                  <TableHead className="text-center w-[10%]">Ocorrências</TableHead>
                  <TableHead className="text-center w-[12%]">Clientes</TableHead>
                  <TableHead className="text-center w-[13%]">Última</TableHead>
                  <TableHead className="text-center w-[10%]">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productSummary.map((p) => {
                  const key = p.codigo + p.nome;
                  const aberto = expandido === key;
                  const detalhes = aberto ? eventosFiltrados.filter(c => (c.codigo_produto || c.nome_produto || "SEM_COD") === (p.codigo === "—" ? p.nome : p.codigo)) : [];
                  return (
                    <Fragment key={key}>
                      <TableRow>
                        <TableCell>
                          <p className="text-[11px] font-mono text-muted-foreground">{p.codigo}</p>
                          <p className="text-sm font-semibold leading-tight">{p.nome}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-base font-bold tabular-nums text-rose-600 dark:text-rose-400">
                            {p.porUnidade ? fmtUnid(p.qtdCortada) : fmtKg(p.pesoCortado)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">{p.porUnidade ? "UNID" : "kg"}</span>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{p.qtdPedidos}</TableCell>
                        <TableCell className="text-center tabular-nums">{p.clientes.size}</TableCell>
                        <TableCell className="text-center text-xs">
                          {p.ultimaData ? format(new Date(p.ultimaData + "T00:00:00"), "dd/MM/yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpandido(aberto ? null : key)}>
                            {aberto ? "Ocultar" : "Ver"}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {aberto && detalhes.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30 p-0">
                            <div className="p-3 space-y-1">
                              {detalhes.map(d => (
                                <div key={d.id} className="text-xs grid grid-cols-12 gap-2 py-1 border-b last:border-0">
                                  <span className="col-span-2 tabular-nums">{d.data && format(new Date(d.data + "T00:00:00"), "dd/MM/yyyy")}</span>
                                  <span className="col-span-1 tabular-nums">#{d.numero_pedido ?? "—"}</span>
                                  <span className="col-span-4 truncate">{d.cliente || "—"}</span>
                                  <span className="col-span-2 truncate text-muted-foreground">{d.nome_carga || "—"}</span>
                                  <span className="col-span-2 truncate text-muted-foreground">{d.motivo_ruptura || (d.ruptura ? "Ruptura total" : "Peso reduzido")}</span>
                                  <span className="col-span-1 text-right tabular-nums text-rose-600 dark:text-rose-400">{fmtKg(pesoNaoCarregado(d))} kg</span>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* =================================================================== */
/*                              MAIN PAGE                               */
/* =================================================================== */

function RupturasInner() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isLogistica = role === "logistica";
  const isFaturamento = role === "faturamento";
  const canEdit = isAdmin || isFaturamento || isLogistica;

  const { data: vendedores = [] } = useVendedores();
  const { data: tiposCaminhao = [] } = useTiposCaminhao();
  const { data: produtos = [] } = useProdutos();
  const { data: clientes = [] } = useClientes();
  const createMut = useCreateCarregamento();
  const batchCreateMut = useBatchCreateCarregamento();
  const updateMut = useUpdateCarregamento();
  const deleteMut = useDeleteCarregamento();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Carregamento | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>("vendas");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSubmit = useCallback((values: Record<string, any>) => {
    if (values.id) {
      const { _batch, ...updatePayload } = values;
      updateMut.mutate(updatePayload);
      if (Array.isArray(_batch) && _batch.length > 0) batchCreateMut.mutate(_batch);
      return;
    }
    if (Array.isArray(values._batch)) {
      batchCreateMut.mutate(values._batch.map((row) => ({ ...row, status: "Aguardando pedido" })));
      return;
    }
    createMut.mutate({ ...values, status: "Aguardando pedido" });
  }, [updateMut, batchCreateMut, createMut]);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteId) deleteMut.mutate(deleteId);
    setDeleteId(null);
  }, [deleteId, deleteMut]);

  return (
    <Layout>
      <main className="p-4 md:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Rupturas</h1>
        </div>

        <Tabs defaultValue="atual" className="space-y-5">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="atual" className="gap-2">
              <Activity className="h-4 w-4" /> Faltando agora
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <History className="h-4 w-4" /> Histórico do mês
            </TabsTrigger>
          </TabsList>

          <TabsContent value="atual" className="mt-0">
            <FaltandoAgora canEdit={canEdit} onNovo={() => { setEditing(null); setDialogMode("vendas"); setDialogOpen(true); }} />
          </TabsContent>

          <TabsContent value="historico" className="mt-0">
            <HistoricoMes />
          </TabsContent>
        </Tabs>
      </main>

      {dialogOpen && (
        <CarregamentoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          editing={editing}
          selectedDate={getToday()}
          onSubmit={handleSubmit}
          vendedores={vendedores}
          tiposCaminhao={tiposCaminhao}
          produtos={produtos}
          clientes={clientes}
        />
      )}
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Layout>
  );
}

export default function Rupturas() {
  return (
    <RupturasErrorBoundary>
      <RupturasInner />
    </RupturasErrorBoundary>
  );
}
