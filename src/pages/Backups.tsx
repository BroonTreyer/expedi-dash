import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, RotateCcw, Plus, Loader2, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Snapshot {
  id: string;
  description: string;
  created_at: string;
  record_counts: Record<string, number>;
}

const TABLE_LABELS: Record<string, string> = {
  carregamentos_dia: "Carregamentos",
  produtos: "Produtos",
  clientes: "Clientes",
  vendedores: "Vendedores",
  motoristas: "Motoristas",
  caminhoes: "Caminhões",
  movimentacoes_portaria: "Mov. Portaria",
  veiculos_esperados: "Veíc. Esperados",
  tipos_caminhao: "Tipos Caminhão",
};

export default function Backups() {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState("");

  const { data: snapshots, isLoading } = useQuery({
    queryKey: ["data_snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_snapshots")
        .select("id, description, created_at, record_counts")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Snapshot[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (desc: string) => {
      const { data, error } = await supabase.functions.invoke("backup-snapshot", {
        body: { action: "create", description: desc },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Snapshot criado com sucesso!");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["data_snapshots"] });
    },
    onError: (err: any) => toast.error(err.message || "Erro ao criar snapshot"),
  });

  const restoreMutation = useMutation({
    mutationFn: async (snapshotId: string) => {
      const { data, error } = await supabase.functions.invoke("backup-snapshot", {
        body: { action: "restore", snapshot_id: snapshotId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Dados restaurados com sucesso!");
      setRestoreId(null);
      setConfirmText("");
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao restaurar");
      setRestoreId(null);
      setConfirmText("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("data_snapshots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Snapshot excluído");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["data_snapshots"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const wipeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("backup-snapshot", {
        body: { action: "wipe_orders" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.deleted ?? 0} pedidos apagados com sucesso!`);
      setWipeOpen(false);
      setWipeConfirm("");
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao apagar pedidos");
      setWipeOpen(false);
      setWipeConfirm("");
    },
  });

  const syncClientsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("backup-snapshot", {
        body: { action: "sync_clients" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.updated ?? 0} registros de pedidos atualizados com dados dos clientes!`);
      queryClient.invalidateQueries({ queryKey: ["carregamentos"] });
    },
    onError: (err: any) => toast.error(err.message || "Erro ao sincronizar clientes"),
  });

  const totalRecords = (counts: Record<string, number>) =>
    Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Backups</h1>
          <p className="text-sm text-muted-foreground">
            Crie snapshots dos dados e restaure quando necessário
          </p>
        </div>

        {/* Create snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" /> Criar Snapshot
            </CardTitle>
            <CardDescription>Salva uma cópia completa de todos os dados operacionais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Descrição (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="max-w-md"
              />
              <Button
                onClick={() => createMutation.mutate(description)}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Criar Snapshot
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Snapshots list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Snapshots Salvos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : !snapshots?.length ? (
              <p className="text-muted-foreground text-sm py-4">Nenhum snapshot criado ainda.</p>
            ) : (
              <div className="space-y-3">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {snap.description || "Sem descrição"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(snap.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {" · "}
                        {totalRecords(snap.record_counts).toLocaleString("pt-BR")} registros
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(snap.record_counts).map(([table, count]) => (
                          <span
                            key={table}
                            className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
                          >
                            {TABLE_LABELS[table] || table}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreId(snap.id)}
                        disabled={restoreMutation.isPending}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(snap.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync clients */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Sincronizar Dados
            </CardTitle>
            <CardDescription>
              Atualiza nome, cidade e UF dos pedidos existentes com os dados atuais da tabela de clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => syncClientsMutation.mutate()}
              disabled={syncClientsMutation.isPending}
            >
              {syncClientsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar Clientes com Pedidos
            </Button>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Zona de Perigo
            </CardTitle>
            <CardDescription>Ações irreversíveis — crie um snapshot antes de prosseguir</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setWipeOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Apagar Todos os Pedidos
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Restore confirmation */}
      <AlertDialog open={!!restoreId} onOpenChange={() => { setRestoreId(null); setConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar Snapshot</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá <strong>substituir todos os dados atuais</strong> pelos dados do snapshot.
              Esta ação não pode ser desfeita. Digite <strong>RESTAURAR</strong> para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder='Digite "RESTAURAR"'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={confirmText !== "RESTAURAR" || restoreMutation.isPending}
              onClick={() => restoreId && restoreMutation.mutate(restoreId)}
            >
              {restoreMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Restauração
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete snapshot confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Snapshot</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este snapshot? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Wipe orders confirmation */}
      <AlertDialog open={wipeOpen} onOpenChange={() => { setWipeOpen(false); setWipeConfirm(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Apagar Todos os Pedidos</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá <strong>apagar permanentemente todos os pedidos</strong> da tabela de carregamentos.
              Crie um snapshot antes se quiser poder restaurar depois.
              Digite <strong>APAGAR TUDO</strong> para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder='Digite "APAGAR TUDO"'
            value={wipeConfirm}
            onChange={(e) => setWipeConfirm(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={wipeConfirm !== "APAGAR TUDO" || wipeMutation.isPending}
              onClick={() => wipeMutation.mutate()}
            >
              {wipeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Apagar Todos os Pedidos
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}