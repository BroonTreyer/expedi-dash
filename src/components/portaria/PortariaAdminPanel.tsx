import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trash2, CheckCircle2, Loader2, Ghost, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";

const DIAS_FANTASMA = 7;
const DIAS_ESPERADO = 7;

export function PortariaAdminPanel() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [confirmFantasmas, setConfirmFantasmas] = useState(false);
  const [confirmEsperados, setConfirmEsperados] = useState(false);

  const fantasmas = useQuery({
    queryKey: ["admin-fantasmas-portaria"],
    enabled: !!session,
    queryFn: async () => {
      const cutoff = new Date(Date.now() - DIAS_FANTASMA * 86400000).toISOString();
      const { data, error } = await supabase
        .from("movimentacoes_portaria")
        .select("id, placa, motorista, empresa, carga_id, data_hora, horario_entrada")
        .eq("tipo_movimento", "entrada")
        .not("horario_entrada", "is", null)
        .is("horario_saida_final", null)
        .lt("data_hora", cutoff)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const esperados = useQuery({
    queryKey: ["admin-esperados-antigos"],
    enabled: !!session,
    queryFn: async () => {
      const d = new Date();
      d.setDate(d.getDate() - DIAS_ESPERADO);
      const cutoff = d.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("veiculos_esperados")
        .select("id, placa, motorista, transportadora, carga_id, data_referencia")
        .eq("conferido", false)
        .lt("data_referencia", cutoff)
        .order("data_referencia", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const finalizarFantasma = useMutation({
    mutationFn: async (id: string) => {
      const agora = new Date().toISOString();
      const { error } = await supabase
        .from("movimentacoes_portaria")
        .update({
          horario_saida_final: agora,
          etapa_terceirizado: "finalizado",
          observacoes: "[Finalizado manualmente pelo admin - registro antigo]",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimentação finalizada");
      qc.invalidateQueries({ queryKey: ["admin-fantasmas-portaria"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes-portaria"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao finalizar"),
  });

  const finalizarTodosFantasmas = useMutation({
    mutationFn: async () => {
      const ids = (fantasmas.data || []).map((f) => f.id);
      if (!ids.length) return;
      const agora = new Date().toISOString();
      const { error } = await supabase
        .from("movimentacoes_portaria")
        .update({
          horario_saida_final: agora,
          etapa_terceirizado: "finalizado",
          observacoes: "[Finalizado em lote pelo admin - registro antigo]",
        })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Todos os registros fantasma foram finalizados");
      qc.invalidateQueries({ queryKey: ["admin-fantasmas-portaria"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes-portaria"] });
      setConfirmFantasmas(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao finalizar em lote"),
  });

  const excluirEsperado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("veiculos_esperados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Veículo esperado removido");
      qc.invalidateQueries({ queryKey: ["admin-esperados-antigos"] });
      qc.invalidateQueries({ queryKey: ["veiculos-esperados"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });

  const excluirTodosEsperados = useMutation({
    mutationFn: async () => {
      const ids = (esperados.data || []).map((f) => f.id);
      if (!ids.length) return;
      const { error } = await supabase.from("veiculos_esperados").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Veículos esperados antigos removidos");
      qc.invalidateQueries({ queryKey: ["admin-esperados-antigos"] });
      qc.invalidateQueries({ queryKey: ["veiculos-esperados"] });
      setConfirmEsperados(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover em lote"),
  });

  const fmtDate = (s?: string | null) => {
    if (!s) return "—";
    const d = new Date(s);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2 items-start">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900 dark:text-amber-200">
          Ferramentas administrativas para limpar registros travados que poluem painéis e KPIs.
          Use com cautela: as ações são permanentes.
        </p>
      </div>

      {/* Fantasmas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ghost className="h-4 w-4 text-destructive" />
              Movimentações Fantasma
              <Badge variant="destructive" className="ml-1">{fantasmas.data?.length || 0}</Badge>
            </CardTitle>
            {(fantasmas.data?.length || 0) > 0 && (
              <Button size="sm" variant="destructive" onClick={() => setConfirmFantasmas(true)}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Finalizar todas
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Veículos no pátio há mais de {DIAS_FANTASMA} dias sem registro de saída final.
          </p>
        </CardHeader>
        <CardContent>
          {fantasmas.isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
            </div>
          ) : (fantasmas.data?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum registro fantasma. ✨
            </p>
          ) : (
            <div className="space-y-2">
              {fantasmas.data!.map((f) => (
                <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 p-2 border rounded-md bg-card">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm">{f.placa || "—"}</span>
                      {f.carga_id && <Badge variant="outline" className="text-[11px]">#{f.carga_id}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {f.motorista || "Sem motorista"} • {f.empresa || "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Entrou em: {fmtDate(f.horario_entrada || f.data_hora)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => finalizarFantasma.mutate(f.id)}
                    disabled={finalizarFantasma.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Finalizar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Esperados antigos */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-amber-600" />
              Veículos Esperados Antigos
              <Badge variant="secondary" className="ml-1">{esperados.data?.length || 0}</Badge>
            </CardTitle>
            {(esperados.data?.length || 0) > 0 && (
              <Button size="sm" variant="destructive" onClick={() => setConfirmEsperados(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir todos
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Previstos com data anterior a {DIAS_ESPERADO} dias atrás que nunca chegaram.
          </p>
        </CardHeader>
        <CardContent>
          {esperados.isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
            </div>
          ) : (esperados.data?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum esperado vencido. ✨
            </p>
          ) : (
            <div className="space-y-2">
              {esperados.data!.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 p-2 border rounded-md bg-card">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm">{v.placa || "—"}</span>
                      {v.carga_id && <Badge variant="outline" className="text-[11px]">#{v.carga_id}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {v.motorista || "Sem motorista"} • {v.transportadora || "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Previsto: {new Date(v.data_referencia + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => excluirEsperado.mutate(v.id)}
                    disabled={excluirEsperado.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmFantasmas} onOpenChange={setConfirmFantasmas}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar todas as movimentações fantasma?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso marcará {fantasmas.data?.length || 0} registros antigos como finalizados (saída agora).
              Não é possível reverter facilmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => finalizarTodosFantasmas.mutate()}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmEsperados} onOpenChange={setConfirmEsperados}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todos os esperados antigos?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá permanentemente {esperados.data?.length || 0} previsões vencidas que nunca chegaram.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => excluirTodosEsperados.mutate()}>
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}