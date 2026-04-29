import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
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
import {
  AlertTriangle,
  Weight,
  Plus,
  Printer,
  CalendarIcon,
  Download,
  PackageX,
  Package,
} from "lucide-react";
import { isPorUnidade } from "@/lib/constants";
import { isRupturaParcial, pesoNaoCarregado } from "@/lib/peso-utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RupturasPrintDialog, type RupturasPrintData } from "@/components/dashboard/RupturasPrintDialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
function fmtUnid(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

/* =================================================================== */
/*                              KPI CARD                                */
/* =================================================================== */

interface KpiProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "amber" | "rose";
}
function Kpi({ icon, label, value, sub, tone = "amber" }: KpiProps) {
  const toneCls =
    tone === "rose"
      ? "border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300"
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

  const [cargaFilter, setCargaFilter] = useState(() => searchParams.get("carga") || "todos");
  const [busca, setBusca] = useState("");

  const { data: carregamentos = [], isLoading } = useCarregamentos(dateFromStr, dateToStr);
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
  const [dialogMode, setDialogMode] = useState<DialogMode>("logistica");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  // ----- universo de rupturas (totais + parciais) -----
  const todasRupturas = useMemo(
    () => carregamentos.filter((c) => c.ruptura || isRupturaParcial(c)),
    [carregamentos]
  );

  // ----- rupturas filtradas (por carga + busca apenas) -----
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

  // Opções de cargas
  const rupturaCargas = useMemo(
    () => [...new Set(todasRupturas.filter(c => c.nome_carga).map(c => c.nome_carga!))].sort(),
    [todasRupturas]
  );

  // ----- agregados por produto -----
  interface ProdAgg {
    codigo: string;
    nome: string;
    qtdPedidos: number;
    pesoCortado: number;
    qtdCortada: number;
    porUnidade: boolean;
    cargas: Set<string>;
    clientes: Set<string>;
  }
  const productSummary = useMemo<ProdAgg[]>(() => {
    const map = new Map<string, ProdAgg>();
    for (const c of rupturas) {
      const key = c.codigo_produto || c.nome_produto || "SEM_COD";
      const perdido = pesoNaoCarregado(c);
      const porUnid = isPorUnidade(c.nome_produto);
      let g = map.get(key);
      if (!g) {
        g = {
          codigo: c.codigo_produto || "—",
          nome: c.nome_produto || "—",
          qtdPedidos: 0,
          pesoCortado: 0,
          qtdCortada: 0,
          porUnidade: porUnid,
          cargas: new Set(),
          clientes: new Set(),
        };
        map.set(key, g);
      }
      g.qtdPedidos += 1;
      g.pesoCortado += perdido;
      // qtd cortada (em unidades) = original - atual quando faz sentido
      const qOrig = c.quantidade_original ?? c.quantidade ?? 0;
      const qAtual = c.ruptura ? 0 : (c.quantidade ?? 0);
      const qPerdida = Math.max(0, qOrig - qAtual);
      g.qtdCortada += qPerdida;
      if (c.nome_carga) g.cargas.add(c.nome_carga);
      if (c.codigo_cliente) g.clientes.add(c.codigo_cliente);
    }
    // Ordena pela quantidade faltando, respeitando a unidade
    return [...map.values()].sort((a, b) => {
      const va = a.porUnidade ? a.qtdCortada : a.pesoCortado;
      const vb = b.porUnidade ? b.qtdCortada : b.pesoCortado;
      return vb - va;
    });
  }, [rupturas]);

  // ----- KPIs (apenas 2) -----
  const kpis = useMemo(() => {
    let pesoTotal = 0;
    let unidTotal = 0;
    for (const p of productSummary) {
      if (p.porUnidade) unidTotal += p.qtdCortada;
      else pesoTotal += p.pesoCortado;
    }
    return { pesoTotal, unidTotal, itens: rupturas.length };
  }, [productSummary, rupturas.length]);

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
        qtd: p.qtdCortada,
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
      })),
    };
  }, [rupturas, dateFromStr, dateToStr, kpis.pesoTotal, productSummary]);

  // ----- handlers -----
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

  const handleExportCsv = () => {
    const periodo = `${format(dateRange.from ?? today, "dd-MM-yyyy")}_a_${format(dateRange.to ?? dateRange.from ?? today, "dd-MM-yyyy")}`;
    const rows: (string | number)[][] = [
      ["Código", "Produto", "Faltando", "Unidade", "Pedidos", "Clientes", "Cargas"],
    ];
    for (const p of productSummary) {
      rows.push([
        p.codigo,
        p.nome,
        p.porUnidade ? p.qtdCortada : p.pesoCortado,
        p.porUnidade ? "UNID" : "kg",
        p.qtdPedidos,
        p.clientes.size,
        [...p.cargas].join(" | "),
      ]);
    }
    exportCsv(`rupturas_por_produto_${periodo}.csv`, rows);
  };

  const isMobile = useIsMobile();

  // helper de exibição de cargas (até 3, depois "+N")
  const renderCargas = (cargas: Set<string>) => {
    const arr = [...cargas];
    if (arr.length === 0) return <span className="text-muted-foreground">—</span>;
    const visible = arr.slice(0, 3).join(", ");
    const extra = arr.length - 3;
    return (
      <span>
        {visible}
        {extra > 0 && <span className="text-muted-foreground"> +{extra}</span>}
      </span>
    );
  };

  return (
    <Layout>
      <main className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-rose-500" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Rupturas</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Quais produtos estão faltando entre{" "}
              {format(dateRange.from ?? today, "dd/MM/yyyy", { locale: ptBR })} e{" "}
              {format(dateRange.to ?? dateRange.from ?? today, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              <Button size="sm" onClick={() => { setEditing(null); setDialogMode("vendas"); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Novo Pedido (Ruptura)</span><span className="sm:hidden">Nova</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filtros enxutos */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
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

              <Select value={cargaFilter} onValueChange={setCargaFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Carga" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as cargas</SelectItem>
                  {rupturaCargas.map((nc) => <SelectItem key={nc} value={nc}>{nc}</SelectItem>)}
                </SelectContent>
              </Select>

              <Input
                placeholder="Buscar produto ou carga..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            {(cargaFilter !== "todos" || busca) && (
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setCargaFilter("todos"); setBusca(""); }}>
                  Limpar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPIs (apenas 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Kpi
            icon={<PackageX className="h-6 w-6" />}
            label="Itens em ruptura"
            value={kpis.itens}
            sub={`${productSummary.length} produto(s) afetado(s)`}
            tone="rose"
          />
          <Kpi
            icon={<Weight className="h-6 w-6" />}
            label="Faltando"
            value={
              <>
                {kpis.pesoTotal > 0 && <>{fmtTon(kpis.pesoTotal)} TON</>}
                {kpis.pesoTotal > 0 && kpis.unidTotal > 0 && <span className="mx-1.5 text-muted-foreground">·</span>}
                {kpis.unidTotal > 0 && <>{fmtUnid(kpis.unidTotal)} UNID</>}
                {kpis.pesoTotal === 0 && kpis.unidTotal === 0 && <>—</>}
              </>
            }
            sub={kpis.pesoTotal > 0 ? `${fmtKg(kpis.pesoTotal)} kg em peso` : "sem peso registrado"}
          />
        </div>

        {/* Lista única de produtos faltando */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Carregando dados...</div>
        ) : productSummary.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Nenhum produto em ruptura no período</p>
              <p className="text-xs text-muted-foreground mt-1">Tudo certo por aqui.</p>
            </CardContent>
          </Card>
        ) : isMobile ? (
          <div className="space-y-2">
            {productSummary.map((p) => (
              <Card key={p.codigo + p.nome} className="border-l-4 border-l-rose-500">
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
                  <div className="text-[11px] text-muted-foreground">
                    Cargas: {renderCargas(p.cargas)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[45%]">Produto</TableHead>
                    <TableHead className="text-right w-[18%]">Faltando</TableHead>
                    <TableHead className="text-center w-[10%]">Pedidos</TableHead>
                    <TableHead className="text-center w-[10%]">Clientes</TableHead>
                    <TableHead className="w-[17%]">Cargas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSummary.map((p) => (
                    <TableRow key={p.codigo + p.nome}>
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Diálogos */}
      {dialogOpen && (
        <CarregamentoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={dialogMode}
          editing={editing}
          selectedDate={dateFromStr}
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
      <RupturasPrintDialog open={printOpen} onOpenChange={setPrintOpen} data={printData} />
    </Layout>
  );
}