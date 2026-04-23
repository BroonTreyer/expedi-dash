import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { CarregamentoTable } from "@/components/dashboard/CarregamentoTable";
import { useIsMobile } from "@/hooks/use-mobile";
import { CarregamentoDialog, type DialogMode } from "@/components/dashboard/CarregamentoDialog";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import {
  useCarregamentos,
  useCreateCarregamento,
  useUpdateCarregamento,
  useDeleteCarregamento,
  useBatchDeleteCarregamento,
  useBatchCreateCarregamento,
  type Carregamento,
} from "@/hooks/useCarregamentos";
import { useVendedores } from "@/hooks/useVendedores";
import { useTiposCaminhao } from "@/hooks/useTiposCaminhao";
import { useProdutos } from "@/hooks/useProdutos";
import { useClientes } from "@/hooks/useClientes";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogRupturas, type AuditEntry } from "@/hooks/useAuditLog";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Weight,
  Package,
  Plus,
  Printer,
  CalendarIcon,
  Truck,
  Users,
  PencilLine,
  TrendingDown,
  Download,
  Clock,
  User as UserIcon,
  PackageX,
} from "lucide-react";
import { RUPTURA_STATUSES, RUPTURA_STATUS_COLORS, isPorUnidade } from "@/lib/constants";
import { isRupturaParcial, pesoNaoCarregado } from "@/lib/peso-utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RupturasPrintDialog, type RupturasPrintData } from "@/components/dashboard/RupturasPrintDialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function fmtKg(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}
function fmtTon(kg: number) {
  return (kg / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/* =================================================================== */
/*                              KPI GRID                                */
/* =================================================================== */

interface KpiProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "amber" | "rose" | "neutral";
}
function Kpi({ icon, label, value, sub, tone = "amber" }: KpiProps) {
  const toneCls =
    tone === "rose"
      ? "border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300"
      : tone === "neutral"
      ? "border-border bg-card text-foreground"
      : "border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300";
  return (
    <Card className={cn("min-h-[78px] sm:min-h-[92px]", toneCls)}>
      <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
        <div className="shrink-0 opacity-80">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
          <p className="text-base sm:text-2xl font-bold tabular-nums tracking-tight truncate">{value}</p>
          {sub && <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* =================================================================== */
/*                              TOP BARS                                */
/* =================================================================== */

interface BarItem { label: string; value: number; sub?: string; danger?: boolean; }
function TopBars({ title, items, unit = "kg", emptyText }: { title: string; items: BarItem[]; unit?: string; emptyText?: string }) {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <p className="text-sm font-semibold mb-3">{title}</p>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">{emptyText ?? "Sem dados no período"}</p>
        ) : (
          <div className="space-y-2.5">
            {items.map((it, i) => {
              const pct = (it.value / max) * 100;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className={cn("truncate", it.danger && "text-rose-600 dark:text-rose-400 font-medium")}>{it.label}</span>
                    <span className="font-mono shrink-0">
                      {fmtKg(it.value)} {unit}
                      {it.sub && <span className="text-muted-foreground ml-1">· {it.sub}</span>}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", it.danger ? "bg-rose-500" : "bg-amber-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* =================================================================== */
/*                        EXPORT CSV HELPER                             */
/* =================================================================== */

function exportCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(cell => {
    const s = String(cell ?? "");
    if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* =================================================================== */
/*                              MAIN PAGE                               */
/* =================================================================== */

type TipoFiltro = "ambas" | "total" | "parcial";

export default function Rupturas() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isLogistica = role === "logistica";
  const isFaturamento = role === "faturamento";
  const canEdit = isAdmin || isFaturamento || isLogistica;

  const [searchParams] = useSearchParams();
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const [dateRange, setDateRange] = useState<DateRange>({ from: sevenDaysAgo, to: today });
  const dateFromStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : getToday();
  const dateToStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : dateFromStr;

  const [vendedorFilter, setVendedorFilter] = useState("todos");
  const [cargaFilter, setCargaFilter] = useState(() => searchParams.get("carga") || "todos");
  const [clienteFilter, setClienteFilter] = useState("todos");
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("ambas");
  const [busca, setBusca] = useState("");
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("carga") ? "itens" : "visao");

  const { data: carregamentos = [], isLoading } = useCarregamentos(dateFromStr, dateToStr);
  const { data: vendedores = [] } = useVendedores();
  const { data: tiposCaminhao = [] } = useTiposCaminhao();
  const { data: produtos = [] } = useProdutos();
  const { data: clientes = [] } = useClientes();
  const createMut = useCreateCarregamento();
  const batchCreateMut = useBatchCreateCarregamento();
  const updateMut = useUpdateCarregamento();
  const deleteMut = useDeleteCarregamento();
  const batchDeleteMut = useBatchDeleteCarregamento();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Carregamento | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>("logistica");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  // ----- mapas auxiliares -----
  const ufByCodCliente = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clientes) if (c.codigo_cliente && c.uf) m.set(c.codigo_cliente, c.uf);
    return m;
  }, [clientes]);

  // ----- universo de rupturas (totais + parciais) sem filtros, p/ agregados de carga -----
  const todasRupturas = useMemo(
    () => carregamentos.filter((c) => c.ruptura || isRupturaParcial(c)),
    [carregamentos]
  );

  // ----- rupturas filtradas (tabelas/abas reativas) -----
  const rupturas = useMemo(() => {
    return carregamentos.filter((c) => {
      const total = c.ruptura;
      const parcial = !c.ruptura && isRupturaParcial(c);
      if (!total && !parcial) return false;
      if (tipoFiltro === "total" && !total) return false;
      if (tipoFiltro === "parcial" && !parcial) return false;
      if (vendedorFilter !== "todos" && c.vendedor_id !== vendedorFilter) return false;
      if (cargaFilter !== "todos" && c.nome_carga !== cargaFilter) return false;
      if (clienteFilter !== "todos" && c.codigo_cliente !== clienteFilter) return false;
      if (busca) {
        const b = busca.toLowerCase();
        if (
          !c.nome_produto?.toLowerCase().includes(b) &&
          !c.codigo_produto?.toLowerCase().includes(b) &&
          !c.cliente?.toLowerCase().includes(b) &&
          !c.nome_carga?.toLowerCase().includes(b) &&
          !c.codigo_cliente?.toLowerCase().includes(b) &&
          !String(c.numero_pedido ?? "").includes(b)
        ) return false;
      }
      return true;
    });
  }, [carregamentos, tipoFiltro, vendedorFilter, cargaFilter, clienteFilter, busca]);

  // Opções dinâmicas de filtro
  const rupturaVendedorIds = useMemo(
    () => new Set(todasRupturas.map(c => c.vendedor_id).filter(Boolean) as string[]),
    [todasRupturas]
  );
  const filteredVendedores = useMemo(
    () => vendedores.filter(v => rupturaVendedorIds.has(v.id)),
    [vendedores, rupturaVendedorIds]
  );
  const rupturaCargas = useMemo(
    () => [...new Set(todasRupturas.filter(c => c.nome_carga).map(c => c.nome_carga!))].sort(),
    [todasRupturas]
  );
  const rupturaClientes = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of todasRupturas) {
      if (c.codigo_cliente) m.set(c.codigo_cliente, c.cliente ?? c.codigo_cliente);
    }
    return [...m.entries()].map(([codigo, nome]) => ({ codigo, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [todasRupturas]);

  // ----- KPIs -----
  const kpis = useMemo(() => {
    let totais = 0, parciais = 0, pesoTotal = 0;
    const cargasSet = new Set<string>();
    const clientesSet = new Set<string>();
    let pedidosEditados = 0;
    let maiorCorte = { nome: "—", peso: 0 };
    for (const c of rupturas) {
      const perdido = pesoNaoCarregado(c);
      pesoTotal += perdido;
      if (c.ruptura) totais++;
      else parciais++;
      if (c.nome_carga) cargasSet.add(c.nome_carga);
      if (c.codigo_cliente) clientesSet.add(c.codigo_cliente);
      if (c.peso_manual && perdido > 0) pedidosEditados++;
      if (perdido > maiorCorte.peso) {
        maiorCorte = { nome: c.nome_produto || c.codigo_produto || "—", peso: perdido };
      }
    }
    return { totais, parciais, pesoTotal, cargas: cargasSet.size, clientes: clientesSet.size, pedidosEditados, maiorCorte };
  }, [rupturas]);

  // ----- agregados por produto -----
  interface ProdAgg {
    codigo: string;
    nome: string;
    totais: number;
    parciais: number;
    qtdPedidos: number;
    pesoOriginal: number;
    pesoCarregado: number;
    pesoCortado: number;
    qtd: number;
    porUnidade: boolean;
    cargas: Set<string>;
    clientes: Map<string, string>;
  }
  const productSummary = useMemo<ProdAgg[]>(() => {
    const map = new Map<string, ProdAgg>();
    for (const c of rupturas) {
      const key = c.codigo_produto || "SEM_COD";
      const perdido = pesoNaoCarregado(c);
      let g = map.get(key);
      if (!g) {
        g = {
          codigo: c.codigo_produto || "—",
          nome: c.nome_produto || "—",
          totais: 0, parciais: 0, qtdPedidos: 0,
          pesoOriginal: 0, pesoCarregado: 0, pesoCortado: 0,
          qtd: 0, porUnidade: isPorUnidade(c.nome_produto),
          cargas: new Set(), clientes: new Map(),
        };
        map.set(key, g);
      }
      g.qtdPedidos += 1;
      if (c.ruptura) g.totais += 1; else g.parciais += 1;
      g.pesoOriginal += c.peso_original ?? c.peso ?? 0;
      g.pesoCarregado += c.ruptura ? 0 : (c.peso ?? 0);
      g.pesoCortado += perdido;
      g.qtd += c.quantidade ?? 0;
      if (c.nome_carga) g.cargas.add(c.nome_carga);
      if (c.codigo_cliente) g.clientes.set(c.codigo_cliente, c.cliente ?? c.codigo_cliente);
    }
    return [...map.values()].sort((a, b) => b.pesoCortado - a.pesoCortado);
  }, [rupturas]);

  // ----- agregados por cliente -----
  interface ClienteAgg {
    codigo: string;
    nome: string;
    uf: string;
    pedidos: Set<number>;
    produtos: Map<string, string>;
    pesoCortado: number;
    cargas: Set<string>;
  }
  const clienteSummary = useMemo<ClienteAgg[]>(() => {
    const map = new Map<string, ClienteAgg>();
    for (const c of rupturas) {
      const key = c.codigo_cliente || "SEM_COD";
      let g = map.get(key);
      if (!g) {
        g = {
          codigo: c.codigo_cliente || "—",
          nome: c.cliente || "—",
          uf: ufByCodCliente.get(c.codigo_cliente ?? "") || c.uf || "—",
          pedidos: new Set(),
          produtos: new Map(),
          pesoCortado: 0,
          cargas: new Set(),
        };
        map.set(key, g);
      }
      if (c.numero_pedido != null) g.pedidos.add(c.numero_pedido);
      if (c.codigo_produto) g.produtos.set(c.codigo_produto, c.nome_produto || c.codigo_produto);
      g.pesoCortado += pesoNaoCarregado(c);
      if (c.nome_carga) g.cargas.add(c.nome_carga);
    }
    return [...map.values()].sort((a, b) => b.pesoCortado - a.pesoCortado);
  }, [rupturas, ufByCodCliente]);

  // ----- agregados por carga (% de corte sobre o planejado) -----
  interface CargaAgg {
    carga_id: string;
    nome_carga: string;
    data: string;
    placa: string | null;
    motorista: string | null;
    itensCortados: number;
    pesoCortado: number;
    pesoPlanejadoCarga: number;
    statuses: Set<string>;
  }
  const cargaSummary = useMemo<CargaAgg[]>(() => {
    // Soma planejado de TODOS os itens da carga (não só rupturas)
    const planejadoPorCarga = new Map<string, number>();
    for (const c of carregamentos) {
      if (!c.carga_id) continue;
      planejadoPorCarga.set(c.carga_id, (planejadoPorCarga.get(c.carga_id) ?? 0) + (c.peso_original ?? c.peso ?? 0));
    }
    const map = new Map<string, CargaAgg>();
    for (const c of rupturas) {
      if (!c.carga_id) continue;
      let g = map.get(c.carga_id);
      if (!g) {
        g = {
          carga_id: c.carga_id,
          nome_carga: c.nome_carga ?? c.carga_id,
          data: c.data,
          placa: c.placa,
          motorista: c.motorista,
          itensCortados: 0,
          pesoCortado: 0,
          pesoPlanejadoCarga: planejadoPorCarga.get(c.carga_id) ?? 0,
          statuses: new Set(),
        };
        map.set(c.carga_id, g);
      }
      g.itensCortados++;
      g.pesoCortado += pesoNaoCarregado(c);
      g.statuses.add(c.status);
    }
    return [...map.values()].sort((a, b) => b.pesoCortado - a.pesoCortado);
  }, [rupturas, carregamentos]);

  // ----- motivos -----
  const motivosSummary = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const c of rupturas) {
      const m = (c.motivo_ruptura ?? "").trim() || "Não informado";
      map.set(m, (map.get(m) ?? 0) + 1);
      total++;
    }
    return [...map.entries()]
      .map(([motivo, count]) => ({ motivo, count, pct: total > 0 ? (count / total) * 100 : 0, naoInformado: motivo === "Não informado" }))
      .sort((a, b) => b.count - a.count);
  }, [rupturas]);

  // ----- audit log -----
  const rupturaIds = useMemo(() => rupturas.map(r => r.id), [rupturas]);
  const { data: auditEntries = [], isLoading: loadingAudit } = useAuditLogRupturas(rupturaIds);
  const itemMap = useMemo(() => {
    const m = new Map<string, Carregamento>();
    for (const c of carregamentos) m.set(c.id, c);
    return m;
  }, [carregamentos]);

  // ----- print data -----
  const printData = useMemo<RupturasPrintData | null>(() => {
    if (rupturas.length === 0) return null;
    return {
      data: dateFromStr === dateToStr ? dateFromStr : `${dateFromStr} a ${dateToStr}`,
      totalRupturas: rupturas.length,
      totalPeso: kpis.pesoTotal,
      productSummary: productSummary.map(p => ({
        codigo: p.codigo,
        nome: p.nome,
        count: p.qtdPedidos,
        peso: p.pesoCortado,
        qtd: p.qtd,
        porUnidade: p.porUnidade,
        cargas: p.cargas,
      })),
      items: rupturas.map((c) => ({
        id: c.id,
        numero_pedido: c.numero_pedido,
        nome_produto: c.nome_produto,
        codigo_produto: c.codigo_produto,
        cliente: c.cliente,
        codigo_cliente: c.codigo_cliente,
        peso: c.peso,
        peso_original: c.peso_original,
        ruptura: c.ruptura,
        motivo_ruptura: c.motivo_ruptura,
      })),
    };
  }, [rupturas, dateFromStr, dateToStr, kpis.pesoTotal, productSummary]);

  // ----- handlers -----
  const handleStatusChange = useCallback((id: string, status: string) => {
    if (!isAdmin && !isLogistica) return;
    updateMut.mutate({ id, status });
  }, [isAdmin, isLogistica, updateMut]);

  const handleEdit = useCallback((c: Carregamento) => {
    if (!canEdit) return;
    setEditing(c); setDialogMode("editar"); setDialogOpen(true);
  }, [canEdit]);

  const handleComplete = useCallback((c: Carregamento) => {
    if (!isAdmin && !isLogistica) return;
    setEditing(c); setDialogMode("logistica"); setDialogOpen(true);
  }, [isAdmin, isLogistica]);

  const handleDeleteRequest = useCallback((id: string) => setDeleteId(id), []);
  const handleDeleteConfirm = useCallback(() => {
    if (deleteId) deleteMut.mutate(deleteId);
    setDeleteId(null);
  }, [deleteId, deleteMut]);
  const handleDeleteManyRequest = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    if (ids.length === 1) setDeleteId(ids[0]);
    else setDeleteIds(ids);
  }, []);
  const handleDeleteManyConfirm = useCallback(() => {
    if (deleteIds && deleteIds.length > 0) batchDeleteMut.mutate(deleteIds);
    setDeleteIds(null);
  }, [deleteIds, batchDeleteMut]);

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

  const goToCarga = (nomeCarga: string) => {
    setCargaFilter(nomeCarga);
    setActiveTab("itens");
  };
  const goToCliente = (codCliente: string) => {
    setClienteFilter(codCliente);
    setActiveTab("itens");
  };

  // ----- export CSV (aba ativa) -----
  const handleExportCsv = () => {
    const periodo = `${format(dateRange.from ?? today, "dd-MM-yyyy")}_a_${format(dateRange.to ?? dateRange.from ?? today, "dd-MM-yyyy")}`;
    if (activeTab === "produto") {
      const rows: (string | number)[][] = [["Código", "Produto", "Totais", "Parciais", "Pedidos", "Peso original (kg)", "Peso carregado (kg)", "Kg cortados", "Cargas afetadas", "Clientes afetados"]];
      for (const p of productSummary) {
        rows.push([p.codigo, p.nome, p.totais, p.parciais, p.qtdPedidos, p.pesoOriginal, p.pesoCarregado, p.pesoCortado, p.cargas.size, p.clientes.size]);
      }
      exportCsv(`rupturas_por_produto_${periodo}.csv`, rows);
    } else if (activeTab === "cliente") {
      const rows: (string | number)[][] = [["Código", "Cliente", "UF", "Pedidos", "Produtos", "Kg não entregues", "Cargas"]];
      for (const c of clienteSummary) {
        rows.push([c.codigo, c.nome, c.uf, c.pedidos.size, [...c.produtos.values()].join(" | "), c.pesoCortado, [...c.cargas].join(" | ")]);
      }
      exportCsv(`rupturas_por_cliente_${periodo}.csv`, rows);
    } else if (activeTab === "carga") {
      const rows: (string | number)[][] = [["Carga", "Data", "Placa", "Motorista", "Itens cortados", "Kg cortados", "% corte", "Statuses"]];
      for (const g of cargaSummary) {
        const pct = g.pesoPlanejadoCarga > 0 ? (g.pesoCortado / g.pesoPlanejadoCarga) * 100 : 0;
        rows.push([g.nome_carga, g.data, g.placa ?? "", g.motorista ?? "", g.itensCortados, g.pesoCortado, pct.toFixed(1), [...g.statuses].join(" | ")]);
      }
      exportCsv(`rupturas_por_carga_${periodo}.csv`, rows);
    } else {
      // itens / visao -> exporta itens crus
      const rows: (string | number)[][] = [["Pedido", "Cliente", "Cód cliente", "Produto", "Cód produto", "Carga", "Tipo", "Peso original", "Peso carregado", "Kg cortados", "Motivo", "Status"]];
      for (const c of rupturas) {
        rows.push([
          c.numero_pedido ?? "",
          c.cliente ?? "",
          c.codigo_cliente ?? "",
          c.nome_produto ?? "",
          c.codigo_produto ?? "",
          c.nome_carga ?? "",
          c.ruptura ? "Total" : "Parcial",
          c.peso_original ?? "",
          c.ruptura ? 0 : (c.peso ?? 0),
          pesoNaoCarregado(c),
          c.motivo_ruptura ?? "",
          c.status,
        ]);
      }
      exportCsv(`rupturas_itens_${periodo}.csv`, rows);
    }
  };

  const isMobile = useIsMobile();

  return (
    <Layout>
      <TooltipProvider delayDuration={100}>
        <div className="p-4 md:p-6 space-y-5">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Rupturas</h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Pedidos com falta de estoque, cortes parciais e edições de carga
              </p>
              <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-400 mt-1 inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Mostrando rupturas <strong>totais e parciais</strong> entre{" "}
                {format(dateRange.from ?? today, "dd/MM/yyyy", { locale: ptBR })} e{" "}
                {format(dateRange.to ?? dateRange.from ?? today, "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {rupturas.length > 0 && (
                <>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={handleExportCsv}>
                    <Download className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Exportar CSV</span>
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => setPrintOpen(true)}>
                    <Printer className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Imprimir</span>
                  </Button>
                </>
              )}
              {canEdit && (
                <Button size="sm" className="text-xs sm:text-sm" onClick={() => { setEditing(null); setDialogMode("vendas"); setDialogOpen(true); }}>
                  <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Novo Pedido (Ruptura)</span><span className="sm:hidden">Nova</span>
                </Button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="p-3 sm:p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-9 text-sm justify-start gap-2", !dateRange.from && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (
                          <>{format(dateRange.from, "dd/MM/yy", { locale: ptBR })} – {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}</>
                        ) : (
                          format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                        )
                      ) : ("Selecionar datas")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="range" selected={dateRange} onSelect={(range) => { if (range) setDateRange(range); }} locale={ptBR} numberOfMonths={2} className={cn("p-3 pointer-events-auto")} />
                    <div className="p-2 border-t flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDateRange({ from: today, to: today })}>Hoje</Button>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 6); setDateRange({ from: d, to: today }); }}>7 dias</Button>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 29); setDateRange({ from: d, to: today }); }}>30 dias</Button>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); setDateRange({ from: new Date(d.getFullYear(), d.getMonth(), 1), to: d }); }}>Mês</Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Vendedor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos vendedores</SelectItem>
                    {filteredVendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome_vendedor}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={cargaFilter} onValueChange={setCargaFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Carga" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as cargas</SelectItem>
                    {rupturaCargas.map((nc) => <SelectItem key={nc} value={nc}>{nc}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={clienteFilter} onValueChange={setClienteFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos clientes</SelectItem>
                    {rupturaClientes.map((c) => <SelectItem key={c.codigo} value={c.codigo}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <ToggleGroup
                  type="single"
                  value={tipoFiltro}
                  onValueChange={(v) => v && setTipoFiltro(v as TipoFiltro)}
                  className="justify-start"
                >
                  <ToggleGroupItem value="ambas" className="h-9 text-xs px-3">Ambas</ToggleGroupItem>
                  <ToggleGroupItem value="total" className="h-9 text-xs px-3">Totais</ToggleGroupItem>
                  <ToggleGroupItem value="parcial" className="h-9 text-xs px-3">Parciais</ToggleGroupItem>
                </ToggleGroup>
                <Input placeholder="Buscar produto, cliente, carga, pedido..." value={busca} onChange={(e) => setBusca(e.target.value)} className="flex-1 h-9 text-sm" />
                {(vendedorFilter !== "todos" || cargaFilter !== "todos" || clienteFilter !== "todos" || busca || tipoFiltro !== "ambas") && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setVendedorFilter("todos"); setCargaFilter("todos"); setClienteFilter("todos"); setBusca(""); setTipoFiltro("ambas"); }}>
                    Limpar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <Kpi
              icon={<PackageX className="h-5 w-5" />}
              label="Itens em ruptura"
              value={rupturas.length}
              sub={<span><span className="text-rose-600 dark:text-rose-400">{kpis.totais} totais</span> · <span>{kpis.parciais} parciais</span></span>}
            />
            <Kpi
              icon={<Weight className="h-5 w-5" />}
              label="Peso não carregado"
              value={`${fmtTon(kpis.pesoTotal)} TON`}
              sub={`${fmtKg(kpis.pesoTotal)} kg`}
            />
            <Kpi
              icon={<Truck className="h-5 w-5" />}
              label="Cargas afetadas"
              value={kpis.cargas}
              sub={`${cargaSummary.length} no período`}
              tone="neutral"
            />
            <Kpi
              icon={<Users className="h-5 w-5" />}
              label="Clientes prejudicados"
              value={kpis.clientes}
              sub={kpis.clientes === 1 ? "1 cliente" : `${kpis.clientes} clientes`}
              tone="neutral"
            />
            <Kpi
              icon={<PencilLine className="h-5 w-5" />}
              label="Pedidos editados"
              value={kpis.pedidosEditados}
              sub="peso reduzido manualmente"
              tone="neutral"
            />
            <Kpi
              icon={<TrendingDown className="h-5 w-5" />}
              label="Maior corte"
              value={`${fmtKg(kpis.maiorCorte.peso)} kg`}
              sub={kpis.maiorCorte.nome}
              tone="rose"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList className="h-auto inline-flex">
                <TabsTrigger value="visao" className="text-xs sm:text-sm">Visão geral</TabsTrigger>
                <TabsTrigger value="produto" className="text-xs sm:text-sm">Por produto</TabsTrigger>
                <TabsTrigger value="cliente" className="text-xs sm:text-sm">Por cliente</TabsTrigger>
                <TabsTrigger value="carga" className="text-xs sm:text-sm">Por carga</TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs sm:text-sm">Linha do tempo</TabsTrigger>
                <TabsTrigger value="itens" className="text-xs sm:text-sm">Itens</TabsTrigger>
              </TabsList>
            </div>

            {/* ==== VISAO GERAL ==== */}
            <TabsContent value="visao" className="space-y-4">
              {rupturas.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                  <TopBars
                    title="Top 5 produtos cortados"
                    items={productSummary.slice(0, 5).map(p => ({
                      label: p.nome,
                      value: p.pesoCortado,
                      sub: `${p.qtdPedidos} pedido${p.qtdPedidos !== 1 ? "s" : ""}`,
                    }))}
                  />
                  <TopBars
                    title="Top 5 clientes prejudicados"
                    items={clienteSummary.slice(0, 5).map(c => ({
                      label: c.nome,
                      value: c.pesoCortado,
                      sub: `${c.cargas.size} carga${c.cargas.size !== 1 ? "s" : ""}`,
                    }))}
                  />
                  <Card className="h-full">
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold mb-3">Motivos de ruptura</p>
                      {motivosSummary.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-6 text-center">Sem dados no período</p>
                      ) : (
                        <div className="space-y-2.5">
                          {motivosSummary.map((m) => (
                            <div key={m.motivo} className="space-y-1">
                              <div className="flex items-baseline justify-between gap-2 text-xs">
                                <span className={cn("truncate", m.naoInformado && "text-rose-600 dark:text-rose-400 font-medium")}>{m.motivo}</span>
                                <span className="font-mono shrink-0">{m.count} · {m.pct.toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full", m.naoInformado ? "bg-rose-500" : "bg-amber-500")} style={{ width: `${m.pct}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* ==== POR PRODUTO ==== */}
            <TabsContent value="produto">
              {productSummary.length === 0 ? <EmptyState /> : (
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Código</TableHead>
                          <TableHead className="text-xs">Produto</TableHead>
                          <TableHead className="text-xs text-center">Total / Parcial</TableHead>
                          <TableHead className="text-xs text-right">Pedidos</TableHead>
                          <TableHead className="text-xs text-right">Peso original</TableHead>
                          <TableHead className="text-xs text-right">Peso carregado</TableHead>
                          <TableHead className="text-xs text-right">Kg cortados</TableHead>
                          <TableHead className="text-xs">Cargas</TableHead>
                          <TableHead className="text-xs text-center">Clientes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productSummary.map((p) => (
                          <TableRow key={p.codigo}>
                            <TableCell className="text-xs font-mono">{p.codigo}</TableCell>
                            <TableCell className="text-xs">
                              {p.nome}
                              {p.porUnidade && <span className="text-[10px] text-primary ml-1">({p.qtd} unid)</span>}
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              <div className="inline-flex gap-1">
                                {p.totais > 0 && <Badge variant="destructive" className="text-[10px] h-5">{p.totais}T</Badge>}
                                {p.parciais > 0 && <Badge variant="outline" className="text-[10px] h-5 border-amber-400 text-amber-700 dark:text-amber-300">{p.parciais}P</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-right font-medium">{p.qtdPedidos}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{fmtKg(p.pesoOriginal)}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{fmtKg(p.pesoCarregado)}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">{fmtKg(p.pesoCortado)}</TableCell>
                            <TableCell className="text-xs">
                              {p.cargas.size > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[260px]">
                                  {[...p.cargas].slice(0, 4).map(nc => (
                                    <button key={nc} onClick={() => goToCarga(nc)} className="inline-flex">
                                      <Badge variant="outline" className="text-[10px] font-mono cursor-pointer hover:bg-muted">{nc}</Badge>
                                    </button>
                                  ))}
                                  {p.cargas.size > 4 && <Badge variant="outline" className="text-[10px]">+{p.cargas.size - 4}</Badge>}
                                </div>
                              ) : <span className="text-muted-foreground/50">—</span>}
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              {p.clientes.size > 0 ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="text-[10px] cursor-help">{p.clientes.size}</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">{[...p.clientes.values()].slice(0, 10).join(", ")}{p.clientes.size > 10 ? "…" : ""}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* ==== POR CLIENTE ==== */}
            <TabsContent value="cliente">
              {clienteSummary.length === 0 ? <EmptyState /> : (
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Código</TableHead>
                          <TableHead className="text-xs">Cliente</TableHead>
                          <TableHead className="text-xs">UF</TableHead>
                          <TableHead className="text-xs text-right">Pedidos</TableHead>
                          <TableHead className="text-xs">Produtos faltantes</TableHead>
                          <TableHead className="text-xs text-right">Kg não entregues</TableHead>
                          <TableHead className="text-xs">Cargas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clienteSummary.map((c) => (
                          <TableRow key={c.codigo}>
                            <TableCell className="text-xs font-mono">{c.codigo}</TableCell>
                            <TableCell className="text-xs">
                              <button onClick={() => goToCliente(c.codigo)} className="text-left hover:underline">
                                {c.nome}
                              </button>
                            </TableCell>
                            <TableCell className="text-xs">{c.uf}</TableCell>
                            <TableCell className="text-xs text-right font-medium">{c.pedidos.size}</TableCell>
                            <TableCell className="text-xs">
                              <div className="flex flex-wrap gap-1 max-w-[320px]">
                                {[...c.produtos.values()].slice(0, 4).map((nm, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px]">{nm}</Badge>
                                ))}
                                {c.produtos.size > 4 && <Badge variant="outline" className="text-[10px]">+{c.produtos.size - 4}</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">{fmtKg(c.pesoCortado)}</TableCell>
                            <TableCell className="text-xs">
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {[...c.cargas].slice(0, 3).map(nc => (
                                  <button key={nc} onClick={() => goToCarga(nc)}>
                                    <Badge variant="outline" className="text-[10px] font-mono cursor-pointer hover:bg-muted">{nc}</Badge>
                                  </button>
                                ))}
                                {c.cargas.size > 3 && <Badge variant="outline" className="text-[10px]">+{c.cargas.size - 3}</Badge>}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* ==== POR CARGA ==== */}
            <TabsContent value="carga">
              {cargaSummary.length === 0 ? <EmptyState /> : (
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Carga</TableHead>
                          <TableHead className="text-xs">Data</TableHead>
                          <TableHead className="text-xs">Veículo</TableHead>
                          <TableHead className="text-xs text-right">Itens cortados</TableHead>
                          <TableHead className="text-xs text-right">Kg cortados</TableHead>
                          <TableHead className="text-xs text-right">% corte</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cargaSummary.map((g) => {
                          const pct = g.pesoPlanejadoCarga > 0 ? (g.pesoCortado / g.pesoPlanejadoCarga) * 100 : 0;
                          const danger = pct > 10;
                          return (
                            <TableRow key={g.carga_id} className={cn(danger && "bg-rose-50/40 dark:bg-rose-950/20")}>
                              <TableCell className="text-xs font-mono font-semibold">{g.nome_carga}</TableCell>
                              <TableCell className="text-xs">{format(new Date(g.data + "T00:00:00"), "dd/MM/yy", { locale: ptBR })}</TableCell>
                              <TableCell className="text-xs">
                                <div className="flex flex-col">
                                  <span className="font-mono">{g.placa ?? "—"}</span>
                                  {g.motorista && <span className="text-muted-foreground text-[10px] truncate max-w-[160px]">{g.motorista}</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium">{g.itensCortados}</TableCell>
                              <TableCell className="text-xs text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">{fmtKg(g.pesoCortado)}</TableCell>
                              <TableCell className={cn("text-xs text-right tabular-nums font-medium", danger && "text-rose-600 dark:text-rose-400")}>
                                {pct.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="flex flex-wrap gap-1">
                                  {[...g.statuses].map((s) => (
                                    <Badge key={s} className={cn("text-[10px]", RUPTURA_STATUS_COLORS[s as keyof typeof RUPTURA_STATUS_COLORS] ?? "bg-muted text-foreground")}>{s}</Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-right">
                                <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => goToCarga(g.nome_carga)}>
                                  Ver itens
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* ==== LINHA DO TEMPO ==== */}
            <TabsContent value="timeline">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Histórico de edições nos itens em ruptura</p>
                    <Badge variant="outline" className="text-[10px] ml-auto">{auditEntries.length} eventos</Badge>
                  </div>
                  {loadingAudit ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">Carregando histórico...</p>
                  ) : auditEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">Sem registros de edição para os itens deste período</p>
                  ) : (
                    <ScrollArea className="h-[480px] pr-2">
                      <div className="space-y-2">
                        {auditEntries.map((e) => (
                          <TimelineRow key={e.id} entry={e} item={itemMap.get(e.entity_id)} />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ==== ITENS (operacional) ==== */}
            <TabsContent value="itens">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Carregando dados...</div>
              ) : rupturas.length === 0 ? (
                <EmptyState />
              ) : (
                <CarregamentoTable
                  data={rupturas}
                  onStatusChange={handleStatusChange}
                  onEdit={handleEdit}
                  onDelete={handleDeleteRequest}
                  onDeleteMany={handleDeleteManyRequest}
                  onComplete={handleComplete}
                  userRole={role}
                  statuses={RUPTURA_STATUSES}
                  statusColors={RUPTURA_STATUS_COLORS}
                  showPesoAprox
                  hideColumns={["etapa", "qtd", "peso"]}
                  canChangeStatus={isAdmin || isLogistica}
                />
              )}
            </TabsContent>
          </Tabs>

          {/* Dialogs */}
          <CarregamentoDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSubmit={handleSubmit}
            editing={editing}
            mode={dialogMode}
            vendedores={vendedores}
            tiposCaminhao={tiposCaminhao}
            produtos={produtos}
            clientes={clientes}
            selectedDate={dateFromStr}
            defaultRuptura
            isSubmitting={createMut.isPending || batchCreateMut.isPending || updateMut.isPending}
          />

          <DeleteConfirmDialog
            open={!!deleteId}
            onOpenChange={(o) => !o && setDeleteId(null)}
            onConfirm={handleDeleteConfirm}
            description="Tem certeza que deseja excluir este carregamento? Esta ação não pode ser desfeita."
          />

          <DeleteConfirmDialog
            open={!!deleteIds}
            onOpenChange={(o) => !o && setDeleteIds(null)}
            onConfirm={handleDeleteManyConfirm}
            title="Excluir pedido completo"
            description={`Tem certeza que deseja excluir este pedido completo (${deleteIds?.length ?? 0} produtos)? Esta ação não pode ser desfeita.`}
            confirmLabel="Excluir pedido"
          />

          <RupturasPrintDialog open={printOpen} onOpenChange={setPrintOpen} data={printData} />
        </div>
      </TooltipProvider>
    </Layout>
  );
}

/* =================================================================== */
/*                            EMPTY STATE                               */
/* =================================================================== */

function EmptyState() {
  return (
    <Card>
      <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-2">
        <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
          <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-sm font-semibold">Sem rupturas no período selecionado 🎯</p>
        <p className="text-xs text-muted-foreground">Ajuste o intervalo de datas ou os filtros para ver outras rupturas.</p>
      </CardContent>
    </Card>
  );
}

/* =================================================================== */
/*                            TIMELINE ROW                              */
/* =================================================================== */

function TimelineRow({ entry, item }: { entry: AuditEntry; item?: Carregamento }) {
  const c = entry.changes ?? {};
  const when = format(new Date(entry.created_at), "dd/MM/yy HH:mm", { locale: ptBR });

  // Constrói descrição amigável das mudanças
  const parts: { key: string; text: React.ReactNode; tone?: "danger" | "warn" | "info" }[] = [];
  if (c.novo) parts.push({ key: "novo", text: "Pedido criado", tone: "info" });
  if (c.excluido) parts.push({ key: "del", text: "Pedido excluído", tone: "danger" });
  if (c.peso?.de !== undefined && c.peso?.para !== undefined) {
    const de = Number(c.peso.de) || 0;
    const para = Number(c.peso.para) || 0;
    const diff = de - para;
    parts.push({
      key: "peso",
      tone: diff > 0 ? "warn" : "info",
      text: <>peso <span className="font-mono">{fmtKg(de)}</span> → <span className="font-mono">{fmtKg(para)}</span> kg{diff !== 0 && <span className={cn("ml-1 font-medium", diff > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>({diff > 0 ? "−" : "+"}{fmtKg(Math.abs(diff))} kg)</span>}</>,
    });
  }
  if (c.ruptura?.de !== undefined && c.ruptura?.para !== undefined) {
    parts.push({
      key: "ruptura",
      tone: c.ruptura.para ? "danger" : "info",
      text: c.ruptura.para ? "marcado como ruptura total" : "ruptura total removida",
    });
  }
  if (c.motivo_ruptura?.para !== undefined) {
    parts.push({ key: "motivo", text: <>motivo: <em>{c.motivo_ruptura.para || "—"}</em></>, tone: "info" });
  }
  if (c.peso_manual?.para === true && parts.length === 0) {
    parts.push({ key: "manual", text: "peso ajustado manualmente", tone: "warn" });
  }
  if (c.quantidade?.de !== undefined && c.quantidade?.para !== undefined) {
    parts.push({ key: "qtd", text: <>quantidade <span className="font-mono">{c.quantidade.de}</span> → <span className="font-mono">{c.quantidade.para}</span></>, tone: "info" });
  }

  if (parts.length === 0) return null;

  return (
    <div className="flex gap-3 p-2.5 rounded-md border border-border/60 bg-card hover:bg-muted/30 transition-colors">
      <div className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
        <PencilLine className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground">{when}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <UserIcon className="h-3 w-3" />
            {entry.user_email || "sistema"}
          </span>
          {item && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="font-mono text-foreground/80">
                {item.numero_pedido ? `#${item.numero_pedido}` : ""}
                {item.nome_produto ? ` · ${item.nome_produto}` : ""}
              </span>
              {item.cliente && <span className="text-muted-foreground truncate max-w-[180px]">→ {item.cliente}</span>}
            </>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {parts.map(p => (
            <span
              key={p.key}
              className={cn(
                "text-[11px]",
                p.tone === "danger" && "text-rose-700 dark:text-rose-400",
                p.tone === "warn" && "text-amber-700 dark:text-amber-400",
                p.tone === "info" && "text-foreground"
              )}
            >
              {p.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}