import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, RotateCcw, Loader2, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const ENTITY_LABELS: Record<string, string> = {
  carregamento: "Carregamento",
  movimentacao: "Movimentação Portaria",
  cliente: "Cliente",
  produto: "Produto",
  motorista: "Motorista",
  caminhao: "Caminhão",
  vendedor: "Vendedor",
  veiculo_esperado: "Veículo Esperado",
};

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id: string | null;
  user_email: string | null;
  changes: Record<string, any>;
  created_at: string;
}

function describeDeleted(entry: AuditEntry): string {
  const e = entry.changes?.excluido || {};
  const parts: string[] = [];
  if (e.pedido) parts.push(`Pedido ${e.pedido}`);
  if (e.produto) parts.push(e.produto);
  if (e.cliente) parts.push(e.cliente);
  if (e.nome) parts.push(e.nome);
  if (e.codigo) parts.push(`Cód. ${e.codigo}`);
  if (e.placa) parts.push(`Placa ${e.placa}`);
  if (e.motorista) parts.push(e.motorista);
  if (e.tipo) parts.push(`Tipo: ${e.tipo}`);
  if (e.categoria) parts.push(e.categoria);
  if (e.carga_id) parts.push(`Carga ${e.carga_id}`);
  return parts.join(" · ") || "Registro excluído";
}

export default function Lixeira() {
  const qc = useQueryClient();
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entidade, setEntidade] = useState("todas");
  const [busca, setBusca] = useState("");
  const [confirmEntry, setConfirmEntry] = useState<AuditEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["lixeira", dataInicio, dataFim, entidade],
    queryFn: async () => {
      let q = supabase
        .from("audit_log")
        .select("*")
        .eq("action", "excluido")
        .gte("created_at", `${dataInicio}T00:00:00`)
        .lte("created_at", `${dataFim}T23:59:59`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (entidade !== "todas") q = q.eq("entity_type", entidade);
      const { data, error } = await q;
      if (error) throw error;
      return data as AuditEntry[];
    },
  });

  const filtered = useMemo(() => {
    if (!busca.trim()) return entries;
    const term = busca.toLowerCase();
    return entries.filter((e) => JSON.stringify(e).toLowerCase().includes(term));
  }, [entries, busca]);

  const restoreMutation = useMutation({
    mutationFn: async (auditLogId: string) => {
      const { data, error } = await supabase.functions.invoke("restore-deleted", {
        body: { audit_log_id: auditLogId },
      });
      if (error) throw new Error(error.message || "Erro ao restaurar");
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast.success("Registro restaurado com sucesso");
      qc.invalidateQueries({ queryKey: ["lixeira"] });
      qc.invalidateQueries({ queryKey: ["audit_logs"] });
      setConfirmEntry(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao restaurar");
    },
  });

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trash2 className="h-6 w-6" /> Lixeira
          </h1>
          <p className="text-sm text-muted-foreground">
            Registros excluídos do sistema. Você pode restaurar qualquer item desde que o snapshot completo esteja disponível.
          </p>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Data início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Data fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={entidade} onValueChange={setEntidade}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos</SelectItem>
                  {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Busca</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="placa, nome, código..." className="h-9 pl-8" />
              </div>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="py-12 text-center text-sm text-muted-foreground">
            <Trash2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            Nenhum item excluído no período.
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry) => {
              const hasSnapshot = !!entry.changes?.deleted_row;
              return (
                <Card key={entry.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="text-[10px]">{ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(entry.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                      {entry.user_email && (
                        <span className="text-[11px] text-muted-foreground">por {entry.user_email}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{describeDeleted(entry)}</p>
                    {!hasSnapshot && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" /> Sem snapshot completo (registro antigo) — não pode ser restaurado
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={hasSnapshot ? "default" : "outline"}
                    disabled={!hasSnapshot}
                    onClick={() => setConfirmEntry(entry)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Restaurar
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmEntry} onOpenChange={(o) => !o && setConfirmEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmEntry && (
                <>
                  <strong>{ENTITY_LABELS[confirmEntry.entity_type] ?? confirmEntry.entity_type}:</strong> {describeDeleted(confirmEntry)}
                  <br /><br />
                  Será reinserido na tabela original. Se o ID antigo estiver livre, será mantido — caso contrário, um novo ID será gerado.
                  Essa ação fica registrada no log de auditoria.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmEntry) restoreMutation.mutate(confirmEntry.id);
              }}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}