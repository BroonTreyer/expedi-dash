import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { CarregamentoTable } from "@/components/dashboard/CarregamentoTable";
import { useIsMobile } from "@/hooks/use-mobile";
import { CarregamentoDialog, type DialogMode } from "@/components/dashboard/CarregamentoDialog";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import { useCarregamentos, useCreateCarregamento, useUpdateCarregamento, useDeleteCarregamento, useBatchCreateCarregamento, type Carregamento } from "@/hooks/useCarregamentos";
import { useVendedores } from "@/hooks/useVendedores";
import { useTiposCaminhao } from "@/hooks/useTiposCaminhao";
import { useProdutos } from "@/hooks/useProdutos";
import { useClientes } from "@/hooks/useClientes";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Weight, Package, Plus, Printer, CalendarIcon, Truck } from "lucide-react";
import { RUPTURA_STATUSES, RUPTURA_STATUS_COLORS, isPorUnidade } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RupturasPrintDialog, type RupturasPrintData } from "@/components/dashboard/RupturasPrintDialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export default function Rupturas() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isLogistica = role === "logistica";
  const isFaturamento = role === "faturamento";
  const canEdit = isAdmin || isFaturamento || isLogistica;

  const [searchParams] = useSearchParams();
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({ from: today, to: today });
  const dateFromStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : getToday();
  const dateToStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : dateFromStr;
  const [vendedorFilter, setVendedorFilter] = useState("todos");
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

  const rupturas = useMemo(() => {
    return carregamentos.filter((c) => {
      if (!c.ruptura) return false;
      if (vendedorFilter !== "todos" && c.vendedor_id !== vendedorFilter) return false;
      if (cargaFilter !== "todos" && c.nome_carga !== cargaFilter) return false;
      if (busca) {
        const b = busca.toLowerCase();
        if (
          !c.nome_produto?.toLowerCase().includes(b) &&
          !c.codigo_produto?.toLowerCase().includes(b) &&
          !c.cliente?.toLowerCase().includes(b) &&
          !c.nome_carga?.toLowerCase().includes(b) &&
          !c.codigo_cliente?.toLowerCase().includes(b)
        ) return false;
      }
      return true;
    });
  }, [carregamentos, vendedorFilter, cargaFilter, busca]);

  // Dynamic filter options — only items with rupturas
  const rupturaVendedorIds = useMemo(() => new Set(carregamentos.filter(c => c.ruptura).map(c => c.vendedor_id).filter(Boolean)), [carregamentos]);
  const filteredVendedores = useMemo(() => vendedores.filter(v => rupturaVendedorIds.has(v.id)), [vendedores, rupturaVendedorIds]);
  const rupturaCargas = useMemo(() => [...new Set(carregamentos.filter(c => c.ruptura && c.nome_carga).map(c => c.nome_carga!))].sort(), [carregamentos]);

  const totalPeso = useMemo(() => rupturas.reduce((s, c) => s + (c.peso ?? 0), 0), [rupturas]);

  // Group by product — include cargas set
  const productSummary = useMemo(() => {
    const map = new Map<string, { codigo: string; nome: string; count: number; peso: number; qtd: number; porUnidade: boolean; cargas: Set<string> }>();
    for (const c of rupturas) {
      const key = c.codigo_produto || "SEM_COD";
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.peso += c.peso ?? 0;
        existing.qtd += c.quantidade ?? 0;
        if (c.nome_carga) existing.cargas.add(c.nome_carga);
      } else {
        const cargas = new Set<string>();
        if (c.nome_carga) cargas.add(c.nome_carga);
        map.set(key, {
          codigo: c.codigo_produto || "—",
          nome: c.nome_produto || "—",
          count: 1,
          peso: c.peso ?? 0,
          qtd: c.quantidade ?? 0,
          porUnidade: isPorUnidade(c.nome_produto),
          cargas,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.peso - a.peso);
  }, [rupturas]);

  // Cargas fechadas com pendência — usa TODOS os carregamentos (sem filtros)
  const cargasComPendencia = useMemo(() => {
    const map = new Map<string, {
      nome_carga: string;
      carga_id: string;
      count: number;
      peso: number;
      produtos: Map<string, { nome: string; count: number }>;
      statuses: Set<string>;
    }>();
    for (const c of carregamentos) {
      if (!c.ruptura || !c.carga_id) continue;
      const key = c.carga_id;
      if (!map.has(key)) {
        map.set(key, {
          nome_carga: c.nome_carga ?? c.carga_id,
          carga_id: c.carga_id,
          count: 0, peso: 0,
          produtos: new Map(),
          statuses: new Set(),
        });
      }
      const g = map.get(key)!;
      g.count++;
      g.peso += c.peso ?? 0;
      g.statuses.add(c.status);
      const pk = c.codigo_produto || "SEM_COD";
      const existing = g.produtos.get(pk);
      if (existing) existing.count++;
      else g.produtos.set(pk, { nome: c.nome_produto || c.codigo_produto || "—", count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [carregamentos]);

  const printData = useMemo<RupturasPrintData | null>(() => {
    if (rupturas.length === 0) return null;
    return {
      data: dateFromStr === dateToStr ? dateFromStr : `${dateFromStr} a ${dateToStr}`,
      totalRupturas: rupturas.length,
      totalPeso: totalPeso,
      productSummary,
      items: rupturas.map((c) => ({
        id: c.id,
        numero_pedido: c.numero_pedido,
        nome_produto: c.nome_produto,
        codigo_produto: c.codigo_produto,
        cliente: c.cliente,
        codigo_cliente: c.codigo_cliente,
        peso: c.peso,
      })),
    };
  }, [rupturas, dateFromStr, dateToStr, totalPeso, productSummary]);

  const handleStatusChange = useCallback((id: string, status: string) => {
    if (!isAdmin && !isLogistica) return;
    updateMut.mutate({ id, status });
  }, [isAdmin, isLogistica, updateMut]);

  const handleEdit = useCallback((c: Carregamento) => {
    if (!canEdit) return;
    setEditing(c);
    setDialogMode("editar");
    setDialogOpen(true);
  }, [canEdit]);

  const handleComplete = useCallback((c: Carregamento) => {
    if (!isAdmin && !isLogistica) return;
    setEditing(c);
    setDialogMode("logistica");
    setDialogOpen(true);
  }, [isAdmin, isLogistica]);

  const handleDeleteRequest = useCallback((id: string) => setDeleteId(id), []);
  const handleDeleteConfirm = useCallback(() => {
    if (deleteId) deleteMut.mutate(deleteId);
    setDeleteId(null);
  }, [deleteId, deleteMut]);

  const handleSubmit = useCallback((values: Record<string, any>) => {
    if (values.id) {
      const { _batch, ...updatePayload } = values;
      updateMut.mutate(updatePayload);

      if (Array.isArray(_batch) && _batch.length > 0) {
        batchCreateMut.mutate(_batch);
      }

      return;
    }

    if (Array.isArray(values._batch)) {
      batchCreateMut.mutate(values._batch.map((row) => ({ ...row, status: "Aguardando pedido" })));
      return;
    }

    createMut.mutate({ ...values, status: "Aguardando pedido" });
  }, [updateMut, batchCreateMut, createMut]);

  const isMobile = useIsMobile();

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Rupturas</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Pedidos com falta de estoque ou produto indisponível</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {rupturas.length > 0 && (
              <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => setPrintOpen(true)}>
                <Printer className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Imprimir</span>
              </Button>
            )}
            {canEdit && (
              <Button size="sm" className="text-xs sm:text-sm" onClick={() => { setEditing(null); setDialogMode("vendas"); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Novo Pedido (Ruptura)</span><span className="sm:hidden">Nova Ruptura</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filtros — moved above KPIs (#4) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("h-9 text-sm justify-start gap-2", !dateRange.from && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (
                    <>{format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} – {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}</>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  "Selecionar datas"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={dateRange} onSelect={(range) => { if (range) setDateRange(range); }} locale={ptBR} numberOfMonths={2} className={cn("p-3 pointer-events-auto")} />
              <div className="p-2 border-t flex justify-end gap-1">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDateRange({ from: today, to: today })}>Hoje</Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 6); setDateRange({ from: d, to: today }); }}>Últimos 7 dias</Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); setDateRange({ from: new Date(d.getFullYear(), d.getMonth(), 1), to: d }); }}>Este mês</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
            <SelectTrigger><SelectValue placeholder="Vendedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos vendedores</SelectItem>
              {filteredVendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.nome_vendedor}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {rupturaCargas.length > 0 && (
            <Select value={cargaFilter} onValueChange={setCargaFilter}>
              <SelectTrigger><SelectValue placeholder="Carga" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as cargas</SelectItem>
                {rupturaCargas.map((nc) => (
                  <SelectItem key={nc} value={nc}>{nc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input placeholder="Buscar produto, cliente, carga..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Rupturas</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-700 dark:text-amber-400">{rupturas.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <Weight className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Peso Total</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-700 dark:text-amber-400 truncate">{(totalPeso / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} TON</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product breakdown */}
        {productSummary.length > 0 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
            <div className="bg-amber-50/50 dark:bg-amber-950/30 px-3 sm:px-4 py-2">
              <p className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-400">Resumo por Produto</p>
            </div>
            {isMobile ? (
              <div className="divide-y divide-border/50">
                {productSummary.map((p) => (
                  <div key={p.codigo} className="px-3 py-2 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-muted-foreground">{p.codigo}</span>
                      <span className="mx-1">—</span>
                      <span className="truncate">{p.nome}</span>
                    </div>
                    <div className="flex gap-3 shrink-0 ml-2 font-medium">
                      <span>{p.count}x</span>
                      {p.porUnidade
                        ? <><span className="text-primary font-semibold">{p.qtd} unid</span><span className="text-muted-foreground">{p.peso.toLocaleString("pt-BR")} kg</span></>
                        : <span>{p.peso.toLocaleString("pt-BR")} kg</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Código</TableHead>
                      <TableHead className="text-xs">Produto</TableHead>
                      <TableHead className="text-xs text-right">Qtd Rupturas</TableHead>
                      <TableHead className="text-xs text-right">Quantidade / Peso</TableHead>
                      <TableHead className="text-xs">Cargas Afetadas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSummary.map((p) => (
                      <TableRow key={p.codigo}>
                        <TableCell className="text-xs font-mono">{p.codigo}</TableCell>
                        <TableCell className="text-xs">{p.nome}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{p.count}</TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {p.porUnidade ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-primary font-semibold">{p.qtd} unid</span>
                              <span className="text-muted-foreground text-[10px]">{p.peso.toLocaleString("pt-BR")} kg</span>
                            </div>
                          ) : (
                            p.peso.toLocaleString("pt-BR")
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {p.cargas.size > 0
                            ? [...p.cargas].map(nc => (
                                <Badge key={nc} variant="outline" className="text-[10px] font-mono mr-1 mb-0.5">{nc}</Badge>
                              ))
                            : <span className="text-muted-foreground/50">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Cargas Fechadas com Pendência */}
        {cargasComPendencia.length > 0 && (
          <div className="rounded-lg border border-destructive/30 overflow-hidden">
            <div className="bg-destructive/10 px-3 sm:px-4 py-2 flex items-center gap-2">
              <Truck className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-destructive">
                Cargas Fechadas com Pendência ({cargasComPendencia.length})
              </p>
            </div>
            {isMobile ? (
              <div className="divide-y divide-border/50">
                {cargasComPendencia.map((g) => (
                  <div key={g.carga_id} className="px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        className="font-mono font-semibold text-primary underline-offset-2 hover:underline text-left"
                        onClick={() => setCargaFilter(g.nome_carga)}
                      >
                        {g.nome_carga}
                      </button>
                      <div className="flex gap-2 shrink-0 font-medium">
                        <span>{g.count} ruptura{g.count !== 1 ? "s" : ""}</span>
                        <span>{g.peso.toLocaleString("pt-BR")} kg</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {[...g.statuses].map((s) => (
                        <Badge key={s} className={cn("text-[10px]", RUPTURA_STATUS_COLORS[s as keyof typeof RUPTURA_STATUS_COLORS] ?? "bg-muted text-foreground")}>{s}</Badge>
                      ))}
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {[...g.produtos.values()].map((p) => `${p.nome} (${p.count}x)`).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Carga</TableHead>
                      <TableHead className="text-xs text-right">Rupturas</TableHead>
                      <TableHead className="text-xs text-right">Peso (kg)</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Produtos Pendentes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cargasComPendencia.map((g) => (
                      <TableRow key={g.carga_id}>
                        <TableCell className="text-xs font-mono">
                          <button
                            className="font-semibold text-primary underline-offset-2 hover:underline"
                            onClick={() => setCargaFilter(g.nome_carga)}
                          >
                            {g.nome_carga}
                          </button>
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">{g.count}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{g.peso.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-wrap gap-1">
                            {[...g.statuses].map((s) => (
                              <Badge key={s} className={cn("text-[10px]", RUPTURA_STATUS_COLORS[s as keyof typeof RUPTURA_STATUS_COLORS] ?? "bg-muted text-foreground")}>{s}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {[...g.produtos.values()].map((p, i) => (
                            <span key={i}>{i > 0 && ", "}{p.nome} <span className="font-medium text-foreground">({p.count}x)</span></span>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}


        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando dados...</div>
        ) : (
          <CarregamentoTable
            data={rupturas}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onComplete={handleComplete}
            userRole={role}
            statuses={RUPTURA_STATUSES}
            statusColors={RUPTURA_STATUS_COLORS}
            showPesoAprox
            hideColumns={["etapa", "qtd", "peso"]}
            canChangeStatus={isAdmin || isLogistica}
          />
        )}

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

        <RupturasPrintDialog open={printOpen} onOpenChange={setPrintOpen} data={printData} />
      </div>
    </Layout>
  );
}
