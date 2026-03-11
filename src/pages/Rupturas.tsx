import { useState, useMemo, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { CarregamentoTable } from "@/components/dashboard/CarregamentoTable";
import { CarregamentoDialog, type DialogMode } from "@/components/dashboard/CarregamentoDialog";
import { DeleteConfirmDialog } from "@/components/dashboard/DeleteConfirmDialog";
import { useCarregamentos, useCreateCarregamento, useUpdateCarregamento, useDeleteCarregamento, type Carregamento } from "@/hooks/useCarregamentos";
import { useVendedores } from "@/hooks/useVendedores";
import { useTiposCaminhao } from "@/hooks/useTiposCaminhao";
import { useProdutos } from "@/hooks/useProdutos";
import { useClientes } from "@/hooks/useClientes";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Weight, Package, Plus } from "lucide-react";
import { RUPTURA_STATUSES, RUPTURA_STATUS_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";

const today = new Date().toISOString().split("T")[0];

export default function Rupturas() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isLogistica = role === "logistica";

  const [date, setDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [vendedorFilter, setVendedorFilter] = useState("todos");
  const [busca, setBusca] = useState("");

  const { data: carregamentos = [], isLoading } = useCarregamentos(date);
  const { data: vendedores = [] } = useVendedores();
  const { data: tiposCaminhao = [] } = useTiposCaminhao();
  const { data: produtos = [] } = useProdutos();
  const { data: clientes = [] } = useClientes();
  const createMut = useCreateCarregamento();
  const updateMut = useUpdateCarregamento();
  const deleteMut = useDeleteCarregamento();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Carregamento | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>("logistica");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const rupturas = useMemo(() => {
    return carregamentos.filter((c) => {
      if (!c.ruptura) return false;
      if (statusFilter !== "todos" && c.status !== statusFilter) return false;
      if (vendedorFilter !== "todos" && c.vendedor_id !== vendedorFilter) return false;
      if (busca) {
        const b = busca.toLowerCase();
        if (!c.nome_produto?.toLowerCase().includes(b) && !c.codigo_produto?.toLowerCase().includes(b) && !c.cliente?.toLowerCase().includes(b)) return false;
      }
      return true;
    });
  }, [carregamentos, statusFilter, vendedorFilter, busca]);

  const totalPeso = useMemo(() => rupturas.reduce((s, c) => s + (c.peso ?? 0), 0), [rupturas]);

  const handleStatusChange = useCallback((id: string, status: string) => {
    if (!isAdmin && !isLogistica) return;
    const updates: Record<string, any> = { id, status };
    if (status === "Carregando") updates.horario_inicio = new Date().toISOString();
    if (status === "Carregado") updates.horario_fim = new Date().toISOString();
    updateMut.mutate(updates);
  }, [isAdmin, isLogistica, updateMut]);

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

  const handleDeleteRequest = useCallback((id: string) => setDeleteId(id), []);
  const handleDeleteConfirm = useCallback(() => {
    if (deleteId) deleteMut.mutate(deleteId);
    setDeleteId(null);
  }, [deleteId, deleteMut]);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <h1 className="text-2xl font-bold tracking-tight">Rupturas</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Pedidos com falta de estoque ou produto indisponível</p>
          </div>
          <Button onClick={() => { setEditing(null); setDialogMode("vendas"); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Novo Pedido (Ruptura)
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Rupturas</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{rupturas.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Weight className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">Peso Total</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{(totalPeso / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} TON</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Vendedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos vendedores</SelectItem>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.nome_vendedor}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {RUPTURA_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-48" />
        </div>

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
          />
        )}

        <CarregamentoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={(values) => {
            if (editing) {
              updateMut.mutate(values);
            } else {
              createMut.mutate({ ...values, ruptura: true, status: "Aguardando pedido" });
            }
          }}
          editing={editing}
          mode={dialogMode}
          vendedores={vendedores}
          tiposCaminhao={tiposCaminhao}
          produtos={produtos}
          clientes={clientes}
          selectedDate={date}
          defaultRuptura
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
