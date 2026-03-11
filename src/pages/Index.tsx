import { useState, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { Filters } from "@/components/dashboard/Filters";
import { CarregamentoTable } from "@/components/dashboard/CarregamentoTable";
import { KanbanView } from "@/components/dashboard/KanbanView";
import { CarregamentoDialog, type DialogMode } from "@/components/dashboard/CarregamentoDialog";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import { useCarregamentos, useCreateCarregamento, useUpdateCarregamento, useDeleteCarregamento, type Carregamento } from "@/hooks/useCarregamentos";
import { useVendedores } from "@/hooks/useVendedores";
import { useTiposCaminhao } from "@/hooks/useTiposCaminhao";
import { useProdutos } from "@/hooks/useProdutos";
import { useClientes } from "@/hooks/useClientes";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, TableIcon, Columns3 } from "lucide-react";
import { RealtimeIndicator } from "@/components/RealtimeIndicator";

const today = new Date().toISOString().split("T")[0];

export default function Index() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isLogistica = role === "logistica";
  const isFaturamento = role === "faturamento";
  const canEdit = isAdmin || isFaturamento;

  const [view, setView] = useState<"table" | "kanban">("table");
  const [filters, setFilters] = useState({
    status: "todos",
    vendedor: "todos",
    tipoCaminhao: "todos",
    busca: "",
    data: today,
    etapa: "todos",
    ruptura: "todos",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Carregamento | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>("vendas");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: carregamentos = [], isLoading } = useCarregamentos(filters.data);
  const { data: vendedores = [] } = useVendedores();
  const { data: tiposCaminhao = [] } = useTiposCaminhao();
  const { data: produtos = [] } = useProdutos();
  const { data: clientes = [] } = useClientes();
  const createMut = useCreateCarregamento();
  const updateMut = useUpdateCarregamento();
  const deleteMut = useDeleteCarregamento();

  const filtered = useMemo(() => {
    return carregamentos.filter((c) => {
      if (filters.status !== "todos" && c.status !== filters.status) return false;
      if (filters.vendedor !== "todos" && c.vendedor_id !== filters.vendedor) return false;
      if (filters.tipoCaminhao !== "todos" && c.tipo_caminhao !== filters.tipoCaminhao) return false;
      if (filters.etapa !== "todos" && c.etapa !== filters.etapa) return false;
      if (filters.ruptura === "sim" && !c.ruptura) return false;
      if (filters.ruptura === "nao" && c.ruptura) return false;
      if (filters.busca) {
        const b = filters.busca.toLowerCase();
        if (!c.nome_produto?.toLowerCase().includes(b) && !c.codigo_produto?.toLowerCase().includes(b)) return false;
      }
      return true;
    });
  }, [carregamentos, filters]);

  const handleStatusChange = useCallback((id: string, status: string) => {
    if (!isAdmin && !isLogistica) return;
    const updates: Record<string, any> = { id, status };
    if (status === "Carregando") updates.horario_inicio = new Date().toISOString();
    if (status === "Carregado") updates.horario_fim = new Date().toISOString();
    updateMut.mutate(updates);
  }, [isAdmin, isLogistica, updateMut]);

  const handleSubmit = useCallback((values: Record<string, any>) => {
    if (values.id) {
      updateMut.mutate(values);
    } else {
      createMut.mutate(values);
    }
  }, [updateMut, createMut]);

  const handleEdit = useCallback((c: Carregamento) => {
    if (!isAdmin) return;
    setEditing(c);
    setDialogMode("editar");
    setDialogOpen(true);
  }, [isAdmin]);

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

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Painel de Expedição</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Acompanhamento diário de carregamentos</p>
              <RealtimeIndicator />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-border rounded-md">
              <Button
                variant={view === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("table")}
                className="rounded-r-none"
              >
                <TableIcon className="h-4 w-4 mr-1" /> Tabela
              </Button>
              <Button
                variant={view === "kanban" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("kanban")}
                className="rounded-l-none"
              >
                <Columns3 className="h-4 w-4 mr-1" /> Kanban
              </Button>
            </div>
            {isAdmin && (
              <Button onClick={handleNewPedido}>
                <Plus className="h-4 w-4 mr-1" /> Novo Pedido
              </Button>
            )}
          </div>
        </div>

        <KpiCards data={filtered} />

        <Filters
          filters={filters}
          onChange={setFilters}
          vendedores={vendedores}
          tiposCaminhao={tiposCaminhao}
        />

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando dados...</div>
        ) : view === "table" ? (
          <CarregamentoTable
            data={filtered}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onComplete={handleComplete}
            userRole={role}
          />
        ) : (
          <KanbanView data={filtered} onStatusChange={handleStatusChange} />
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
          selectedDate={filters.data}
        />

        <DeleteConfirmDialog
          open={!!deleteId}
          onOpenChange={(o) => !o && setDeleteId(null)}
          onConfirm={handleDeleteConfirm}
          description="Tem certeza que deseja excluir este carregamento? Esta ação não pode ser desfeita."
        />
      </div>
    </Layout>
  );
}
