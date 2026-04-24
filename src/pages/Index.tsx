import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Layout } from "@/components/Layout";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { Filters } from "@/components/dashboard/Filters";
import { CarregamentoTable } from "@/components/dashboard/CarregamentoTable";
import { KanbanView } from "@/components/dashboard/KanbanView";
import { CarregamentoDialog, type DialogMode } from "@/components/dashboard/CarregamentoDialog";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import { FechamentoLoteDialog } from "@/components/dashboard/FechamentoLoteDialog";
import { RoteirizacaoDialog, type RoteirizacaoResult } from "@/components/dashboard/RoteirizacaoDialog";
import { CargaPrintDialog, type CargaPrintData } from "@/components/dashboard/CargaPrintDialog";
import { AdicionarCargaDialog, type CargaResumo } from "@/components/dashboard/AdicionarCargaDialog";
import { ImportarPedidoPdfDialog } from "@/components/dashboard/ImportarPedidoPdfDialog";
import { useCarregamentos, useCreateCarregamento, useUpdateCarregamento, useDeleteCarregamento, useBatchDeleteCarregamento, useBatchCreateCarregamento, useBatchUpdateCarregamento, type Carregamento } from "@/hooks/useCarregamentos";
import { useVendedores } from "@/hooks/useVendedores";
import { useTiposCaminhao } from "@/hooks/useTiposCaminhao";
import { useProdutos } from "@/hooks/useProdutos";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, TableIcon, Columns3, Truck, PackageCheck, PackagePlus, Route, FileUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RealtimeIndicator } from "@/components/RealtimeIndicator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export default function Index() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";
  const isLogistica = role === "logistica";
  const isFaturamento = role === "faturamento";
  const canEdit = isAdmin || isFaturamento || isLogistica;

  const [view, setView] = useState<"table" | "kanban">("table");
  const today = new Date();
  const [filters, setFilters] = useState({
    status: "todos",
    vendedor: [] as string[],
    tipoCaminhao: "todos",
    busca: "",
    dateRange: { from: today, to: today } as DateRange,
    etapa: "todos",
    ruptura: "todos",
    cliente: [] as string[],
    uf: "todos",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Carregamento | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>("vendas");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [undoCargaId, setUndoCargaId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loteDialogOpen, setLoteDialogOpen] = useState(false);
  const [printData, setPrintData] = useState<CargaPrintData | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [adicionarCargaOpen, setAdicionarCargaOpen] = useState(false);
  const [showLogistica, setShowLogistica] = useState(false);
  const [roteirizacaoOpen, setRoteirizacaoOpen] = useState(false);
  const [roteirizacaoResult, setRoteirizacaoResult] = useState<RoteirizacaoResult | null>(null);
  const [importPdfOpen, setImportPdfOpen] = useState(false);

  const dateFromStr = filters.dateRange.from ? format(filters.dateRange.from, "yyyy-MM-dd") : getToday();
  const dateToStr = filters.dateRange.to ? format(filters.dateRange.to, "yyyy-MM-dd") : dateFromStr;

  // #7: Reset selectedIds when date changes
  useEffect(() => { setSelectedIds([]); }, [dateFromStr, dateToStr]);
  const { data: carregamentos = [], isLoading } = useCarregamentos(dateFromStr, dateToStr);
  const { data: vendedores = [] } = useVendedores();
  const { data: tiposCaminhao = [] } = useTiposCaminhao();
  const { data: produtos = [] } = useProdutos();
  const createMut = useCreateCarregamento();
  const batchCreateMut = useBatchCreateCarregamento();
  const updateMut = useUpdateCarregamento();
  const batchUpdateMut = useBatchUpdateCarregamento();
  const deleteMut = useDeleteCarregamento();
  const batchDeleteMut = useBatchDeleteCarregamento();

  // Derive unique clients from loaded carregamentos — no heavy fetch needed
  const clientesFromData = useMemo(() => {
    const map = new Map<string, { codigo_cliente: string; nome_cliente: string; cidade?: string | null; uf?: string | null }>();
    for (const c of carregamentos) {
      if (c.codigo_cliente && !map.has(c.codigo_cliente)) {
        map.set(c.codigo_cliente, {
          codigo_cliente: c.codigo_cliente,
          nome_cliente: c.cliente ?? c.codigo_cliente,
          cidade: c.cidade,
          uf: c.uf,
        });
      }
    }
    return Array.from(map.values());
  }, [carregamentos]);

  // Count finalized (hidden) items
  const finalizadosCount = useMemo(() => {
    return carregamentos.filter(c => c.carga_id != null).length;
  }, [carregamentos]);

  // Count logistica-ok items (hidden by default)
  const logisticaOkCount = useMemo(() => {
    return carregamentos.filter(c => c.etapa === "logistica").length;
  }, [carregamentos]);

  // Closed loads for "Adicionar à Carga"
  const cargasFechadas: CargaResumo[] = useMemo(() => {
    const map = new Map<string, CargaResumo>();
    for (const c of carregamentos) {
      if (!c.carga_id) continue;
      if (!map.has(c.carga_id)) {
        map.set(c.carga_id, {
          cargaId: c.carga_id,
          placa: c.placa,
          motorista: c.motorista,
          tipoCaminhao: c.tipo_caminhao,
          horarioPrevisto: c.horario_previsto,
          pesoTotal: 0,
          qtdPedidos: 0,
        });
      }
      const entry = map.get(c.carga_id)!;
      entry.pesoTotal += c.peso ?? 0;
      entry.qtdPedidos += 1;
    }
    return Array.from(map.values());
  }, [carregamentos]);

  const filtered = useMemo(() => {
    return carregamentos.filter((c) => {
      // Hide logistica-ok items unless toggle is active
      if (showLogistica && c.etapa !== "logistica") return false;
      if (!showLogistica && c.etapa === "logistica") return false;
      // Hide finalized items — they appear only in Consolidado
      if (c.carga_id != null && c.status === "Carregado") return false;
      if (filters.status !== "todos" && c.status !== filters.status) return false;
      if (filters.vendedor.length > 0 && !filters.vendedor.includes(c.vendedor_id ?? "")) return false;
      if (filters.tipoCaminhao !== "todos" && c.tipo_caminhao !== filters.tipoCaminhao) return false;
      if (filters.etapa !== "todos" && c.etapa !== filters.etapa) return false;
      if (filters.ruptura === "sim" && !c.ruptura) return false;
      if (filters.ruptura === "nao" && c.ruptura) return false;
      if (filters.cliente.length > 0 && !filters.cliente.includes(c.codigo_cliente ?? "")) return false;
      if (filters.uf !== "todos" && c.uf !== filters.uf) return false;
      if (filters.busca) {
        const b = filters.busca.toLowerCase();
        const fields = [c.nome_produto, c.codigo_produto, c.cliente, c.motorista, c.cidade, c.nome_carga, c.placa, c.codigo_cliente];
        if (!fields.some(f => f?.toLowerCase().includes(b))) return false;
      }
      return true;
    });
  }, [carregamentos, filters, showLogistica]);

  // KPI source: ignora toggle de etapa e ocultação de finalizados,
  // mas respeita filtros explícitos do usuário.
  const kpiSource = useMemo(() => {
    return carregamentos.filter((c) => {
      if (filters.status !== "todos" && c.status !== filters.status) return false;
      if (filters.vendedor.length > 0 && !filters.vendedor.includes(c.vendedor_id ?? "")) return false;
      if (filters.tipoCaminhao !== "todos" && c.tipo_caminhao !== filters.tipoCaminhao) return false;
      if (filters.etapa !== "todos" && c.etapa !== filters.etapa) return false;
      if (filters.ruptura === "sim" && !c.ruptura) return false;
      if (filters.ruptura === "nao" && c.ruptura) return false;
      if (filters.cliente.length > 0 && !filters.cliente.includes(c.codigo_cliente ?? "")) return false;
      if (filters.uf !== "todos" && c.uf !== filters.uf) return false;
      if (filters.busca) {
        const b = filters.busca.toLowerCase();
        const fields = [c.nome_produto, c.codigo_produto, c.cliente, c.motorista, c.cidade, c.nome_carga, c.placa, c.codigo_cliente];
        if (!fields.some(f => f?.toLowerCase().includes(b))) return false;
      }
      return true;
    });
  }, [carregamentos, filters]);

  // Prune selection when filtered data changes
  const filteredIds = useMemo(() => new Set(filtered.map(c => c.id)), [filtered]);
  const selectedInView = useMemo(() => {
    return selectedIds.filter(id => filteredIds.has(id));
  }, [selectedIds, filteredIds]);

  // Compute selected weight
  const selectedWeight = useMemo(() => {
    if (selectedInView.length === 0) return 0;
    const idSet = new Set(selectedInView);
    return filtered.filter(c => idSet.has(c.id)).reduce((s, c) => s + (c.peso ?? 0), 0);
  }, [selectedInView, filtered]);

  // Items for lote dialog
  const selectedItems = useMemo(() => {
    if (selectedInView.length === 0) return [];
    const idSet = new Set(selectedInView);
    return filtered.filter(c => idSet.has(c.id));
  }, [selectedInView, filtered]);

  const handleStatusChange = useCallback((id: string, status: string) => {
    if (!isAdmin && !isLogistica && !isFaturamento) return;
    const updates: Record<string, any> = { id, status };
    if (status === "Carregando") updates.horario_inicio = new Date().toISOString();
    if (status === "Carregado") updates.horario_fim = new Date().toISOString();
    updateMut.mutate(updates);
  }, [isAdmin, isLogistica, isFaturamento, updateMut]);

  // Fields shared across all products of the same order (propagated on edit)
  const SHARED_FIELDS = useMemo(() => [
    'vendedor_id', 'codigo_cliente', 'cliente', 'cidade', 'uf', 'tipo_frete',
    'tipo_caminhao', 'placa', 'motorista', 'transportadora', 'carga_id', 'nome_carga',
    'horario_previsto', 'observacoes', 'status', 'etapa',
  ], []);

  const handleSubmit = useCallback((values: Record<string, any>) => {
    const onFkError = {
      onError: (e: any) => {
        if (e?.message?.includes("foreign key constraint")) {
          toast.error("Código de produto ou cliente inválido. Verifique se estão cadastrados.");
        }
      },
    };

    if (values.id) {
      // Edit mode: update the main item
      const { _batch, ...updatePayload } = values;
      updateMut.mutate(updatePayload, onFkError);

      // If there are additional items from multi-product edit, insert them
      if (Array.isArray(_batch) && _batch.length > 0) {
        batchCreateMut.mutate(_batch, onFkError);
      }

      // Cascade: propagate shared fields to sibling rows (same numero_pedido + data)
      const editedItem = carregamentos.find((c) => c.id === values.id);
      if (editedItem && editedItem.numero_pedido) {
        const siblings = carregamentos.filter(
          (c) =>
            c.id !== values.id &&
            c.numero_pedido === editedItem.numero_pedido &&
            c.data === editedItem.data
        );
        if (siblings.length > 0) {
          const sharedPayload: Record<string, any> = {};
          for (const field of SHARED_FIELDS) {
            if (field in updatePayload) {
              sharedPayload[field] = updatePayload[field];
            }
          }
          if (Object.keys(sharedPayload).length > 0) {
            const siblingUpdates = siblings.map((s) => ({
              id: s.id,
              ...sharedPayload,
            }));
            batchUpdateMut.mutate(siblingUpdates);
          }
        }
      }
    } else {
      if (Array.isArray(values._batch)) {
        batchCreateMut.mutate(values._batch, onFkError);
      } else {
        createMut.mutate(values, onFkError);
      }
    }
  }, [updateMut, createMut, batchCreateMut, batchUpdateMut, carregamentos, SHARED_FIELDS]);

  const handleEdit = useCallback((c: Carregamento) => {
    if (!canEdit) return;
    setEditing(c);
    setDialogMode("editar");
    setDialogOpen(true);
  }, [canEdit]);

  const [cloneItems, setCloneItems] = useState<Carregamento[]>([]);

  const handleClone = useCallback((items: Carregamento[]) => {
    if (!canEdit || items.length === 0) return;
    const cloned = { ...items[0], id: `clone-${crypto.randomUUID()}`, numero_pedido: null } as Carregamento;
    setCloneItems(items);
    setEditing(cloned);
    setDialogMode("vendas");
    setDialogOpen(true);
  }, [canEdit]);

  const handleComplete = useCallback((c: Carregamento) => {
    if (!isAdmin && !isLogistica) return;
    setEditing(c);
    setDialogMode("logistica");
    setDialogOpen(true);
  }, [isAdmin, isLogistica]);

  const handleNewPedido = useCallback(() => {
    setEditing(null);
    setDialogMode("vendas");
    setDialogOpen(true);
  }, []);

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

  const handleUndoCargaRequest = useCallback((cargaId: string) => setUndoCargaId(cargaId), []);
  const handleUndoCargaConfirm = useCallback(async () => {
    if (!undoCargaId) return;
    const { error } = await supabase
      .from("carregamentos_dia")
      .update({
        tipo_caminhao: null,
        placa: null,
        motorista: null,
        ordem_entrega: null,
        horario_previsto: null,
        carga_id: null,
        etapa: "vendas",
      })
      .eq("carga_id", undoCargaId);
    if (error) {
      toast.error("Erro ao desfazer carga: " + error.message);
    } else {
      toast.success("Carga desfeita com sucesso");
      queryClient.invalidateQueries({ queryKey: ["carregamentos"] });
    }
    setUndoCargaId(null);
  }, [undoCargaId, queryClient]);

  const handleLoteSubmit = useCallback(async (updates: { id: string; tipo_caminhao: string; placa: string; motorista: string; transportadora: string; ordem_entrega: number; etapa: string; data: string; horario_previsto?: string; nome_carga?: string }[], meta?: { cargaId: string; transportadora: string; placa: string; motorista: string; dataCarregamento: string; totalPeso: number; totalPedidos: number; destinos: string }) => {
    try {
      batchUpdateMut.mutate(updates);

      // Se tem transportadora, criar previsão de terceirizado na portaria
      if (meta?.transportadora) {
        try {
          await supabase
            .from("veiculos_esperados")
            .insert({
              data_referencia: meta.dataCarregamento,
              grupo: "TERCEIRIZADO",
              placa: meta.placa,
              motorista: meta.motorista || null,
              transportadora: meta.transportadora,
              carga_id: meta.cargaId,
              destino: meta.destinos || null,
              peso: meta.totalPeso || null,
              qtd_entregas: meta.totalPedidos || null,
            });
          queryClient.invalidateQueries({ queryKey: ["veiculos_esperados"] });
        } catch {
          // Non-critical: don't block the main flow
        }
      }
    } catch {
      // errors handled by mutation's onError
    }
    setSelectedIds([]);
  }, [batchUpdateMut, queryClient]);

  // When user unchecks groups inside FechamentoLoteDialog and closes it, remove those IDs from selection
  const handleLoteExcluded = useCallback((excludedItemIds: string[]) => {
    setSelectedIds((prev) => prev.filter((id) => !excludedItemIds.includes(id)));
  }, []);

  const handleAdicionarCargaSubmit = useCallback(async (updates: { id: string; carga_id: string; placa: string | null; motorista: string | null; tipo_caminhao: string | null; horario_previsto: string | null; etapa: string; ordem_entrega: number }[]) => {
    try {
      batchUpdateMut.mutate(updates);
      toast.success(`${updates.length} pedido(s) adicionado(s) à carga`);
    } catch {
      // errors handled by mutation's onError
    }
    setSelectedIds([]);
  }, [batchUpdateMut]);

  const handlePrintCarga = useCallback((cargaId: string) => {
    const itemsInCarga = carregamentos.filter(c => c.carga_id === cargaId);
    if (itemsInCarga.length === 0) return;
    const first = itemsInCarga[0];

    // Group by cliente
    const groupMap = new Map<string, { codigoCliente: string | null; nomeCliente: string | null; items: { id: string; nomeProduto: string | null; peso: number }[]; pesoTotal: number; ordem: number }>();
    for (const c of itemsInCarga) {
      const key = c.codigo_cliente ?? "__none__";
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          codigoCliente: c.codigo_cliente,
          nomeCliente: c.cliente,
          items: [],
          pesoTotal: 0,
          ordem: c.ordem_entrega ?? 999,
        });
      }
      const g = groupMap.get(key)!;
      g.items.push({ id: c.id, nomeProduto: c.nome_produto, peso: c.peso ?? 0 });
      g.pesoTotal += c.peso ?? 0;
    }

    const groups = Array.from(groupMap.values());
    const totalPeso = itemsInCarga.reduce((s, c) => s + (c.peso ?? 0), 0);

    setPrintData({
      cargaId,
      data: first.data,
      tipoCaminhao: first.tipo_caminhao ?? "",
      placa: first.placa ?? "",
      motorista: first.motorista ?? "",
      transportadora: first.transportadora ?? "",
      horarioPrevisto: first.horario_previsto ?? undefined,
      groups,
      totalPeso,
      totalPedidos: itemsInCarga.length,
    });
    setPrintDialogOpen(true);
  }, [carregamentos]);

  const handlePrintReady = useCallback((data: CargaPrintData) => {
    setPrintData(data);
    setPrintDialogOpen(true);
  }, []);

  // Guard: portaria users should never see this page
  if (role === "portaria") {
    return <Navigate to="/portaria" replace />;
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Painel de Expedição</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Acompanhamento diário de carregamentos</p>
                <RealtimeIndicator />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex border border-border rounded-md">
              <Button
                variant={view === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("table")}
                className="rounded-r-none text-xs sm:text-sm"
              >
                <TableIcon className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Tabela</span>
              </Button>
              <Button
                variant={view === "kanban" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("kanban")}
                className="rounded-l-none text-xs sm:text-sm"
              >
                <Columns3 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Kanban</span>
              </Button>
            </div>
            {canEdit && (
              <Button size="sm" onClick={handleNewPedido} className="text-xs sm:text-sm">
                <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Novo Pedido</span><span className="sm:hidden">Novo</span>
              </Button>
            )}
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setImportPdfOpen(true)} className="text-xs sm:text-sm">
                <FileUp className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Importar PDF</span><span className="sm:hidden">PDF</span>
              </Button>
            )}
            {logisticaOkCount > 0 && (
              <Button
                variant={showLogistica ? "default" : "outline"}
                size="sm"
                onClick={() => setShowLogistica(prev => !prev)}
                className="gap-1 text-xs sm:text-sm"
              >
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">{showLogistica ? "Ocultar" : "Ver"} Logística OK</span>
                <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px]">
                  {logisticaOkCount}
                </Badge>
              </Button>
            )}
            {finalizadosCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/consolidado`)}
                className="gap-1 text-xs sm:text-sm"
              >
                <PackageCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Ver Finalizados</span>
                <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px]">
                  {finalizadosCount}
                </Badge>
              </Button>
            )}
          </div>
        </div>

        <KpiCards data={filtered} selectedData={selectedInView.length > 0 ? selectedItems : undefined} />

        <Filters
          filters={filters}
          onChange={setFilters}
          vendedores={vendedores}
          tiposCaminhao={tiposCaminhao}
          clientes={clientesFromData}
          userRole={role}
          carregamentos={carregamentos}
        />

        {/* Selection summary */}
        {selectedInView.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs sm:text-sm font-medium">
            <span>{selectedInView.length} selecionado{selectedInView.length > 1 ? "s" : ""}</span>
            <span className="text-muted-foreground">·</span>
            <span>{selectedWeight.toLocaleString("pt-BR")} kg</span>
            {(isAdmin || isLogistica) && (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                  setRoteirizacaoResult(null); // BUG 7: clear stale result
                  setRoteirizacaoOpen(true);
                }}>
                  <Route className="h-3.5 w-3.5" /> Roteirizar
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={() => {
                  setRoteirizacaoResult(null); // BUG 7: clear stale result when going directly
                  setLoteDialogOpen(true);
                }}>
                  <Truck className="h-3.5 w-3.5 mr-1" /> Fechar Carga
                </Button>
                {cargasFechadas.length > 0 && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAdicionarCargaOpen(true)}>
                    <PackagePlus className="h-3.5 w-3.5 mr-1" /> Add Carga
                  </Button>
                )}
              </>
            )}
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setSelectedIds([])}>
              Limpar
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando dados...</div>
        ) : view === "table" ? (
          <CarregamentoTable
            data={filtered}
            currentDate={dateFromStr}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onClone={handleClone}
            onDelete={handleDeleteRequest}
            onDeleteMany={handleDeleteManyRequest}
            onUndoCarga={handleUndoCargaRequest}
            onPrintCarga={handlePrintCarga}
            onComplete={handleComplete}
            userRole={role}
            selectable={isAdmin || isLogistica || isFaturamento}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        ) : (
          <KanbanView data={filtered} onStatusChange={handleStatusChange} />
        )}

        <CarregamentoDialog
          open={dialogOpen}
          onOpenChange={(v) => { setDialogOpen(v); if (!v) setCloneItems([]); }}
          onSubmit={handleSubmit}
          editing={editing}
          mode={dialogMode}
          vendedores={vendedores}
          tiposCaminhao={tiposCaminhao}
          produtos={produtos}
          clientes={clientesFromData}
          selectedDate={dateFromStr}
          cloneItems={cloneItems}
          isSubmitting={createMut.isPending || batchCreateMut.isPending || updateMut.isPending || batchUpdateMut.isPending}
        />

        <RoteirizacaoDialog
          open={roteirizacaoOpen}
          onOpenChange={setRoteirizacaoOpen}
          items={selectedItems}
          onAdvance={(result) => {
            setRoteirizacaoResult(result);
            setLoteDialogOpen(true);
          }}
          onExcludedChange={handleLoteExcluded}
        />

        <FechamentoLoteDialog
          open={loteDialogOpen}
          onOpenChange={setLoteDialogOpen}
          items={selectedItems}
          tiposCaminhao={tiposCaminhao}
          onSubmit={handleLoteSubmit}
          onPrintReady={handlePrintReady}
          selectedDate={dateFromStr}
          roteirizacao={roteirizacaoResult}
        />

        <CargaPrintDialog
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
          data={printData}
        />

        <AdicionarCargaDialog
          open={adicionarCargaOpen}
          onOpenChange={setAdicionarCargaOpen}
          cargas={cargasFechadas}
          items={selectedItems}
          onSubmit={handleAdicionarCargaSubmit}
        />

        <ImportarPedidoPdfDialog
          open={importPdfOpen}
          onOpenChange={setImportPdfOpen}
          selectedDate={dateFromStr}
          produtos={produtos}
          vendedores={vendedores}
          clientes={clientesFromData}
          existingNumeros={new Set(carregamentos.map(c => c.numero_pedido).filter((n): n is number => n != null))}
          isSubmitting={batchCreateMut.isPending}
          onConfirm={async (rows) => {
            await new Promise<void>((resolve, reject) => {
              batchCreateMut.mutate(rows as any, {
                onSuccess: () => {
                  toast.success(`${rows.length} item(ns) importado(s) com sucesso`);
                  setImportPdfOpen(false);
                  resolve();
                },
                onError: (e: any) => {
                  toast.error(e?.message || "Falha ao importar pedidos");
                  reject(e);
                },
              });
            });
          }}
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

        <DeleteConfirmDialog
          open={!!undoCargaId}
          onOpenChange={(o) => !o && setUndoCargaId(null)}
          onConfirm={handleUndoCargaConfirm}
          title="Desfazer Carga"
          description={`Tem certeza que deseja desfazer a carga ${undoCargaId ?? ""}? Todos os pedidos desta carga terão os dados de transporte removidos e voltarão para a etapa "vendas".`}
        />
      </div>
    </Layout>
  );
}
