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
const LIMITES_CP_HORAS = [24, 48, 72, 168] as const;
type LimiteCpHoras = typeof LIMITES_CP_HORAS[number];

export function PortariaAdminPanel() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [confirmFantasmas, setConfirmFantasmas] = useState(false);
  const [confirmEsperados, setConfirmEsperados] = useState(false);
  const [confirmCargasProprias, setConfirmCargasProprias] = useState(false);
  const [limiteCpHoras, setLimiteCpHoras] = useState<LimiteCpHoras>(24);

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

  const cargasProprias = useQuery({
    queryKey: ["admin-cargas-proprias-travadas", limiteCpHoras],
    enabled: !!session,
    queryFn: async () => {
      const cutoff = new Date(Date.now() - limiteCpHoras * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("movimentacoes_portaria")
        .select("id, placa, motorista, rota, data_hora, horario_real_saida, etapa_carga_propria")
        .eq("categoria", "carga_propria")
        .is("horario_saida_final", null)
        .or("etapa_carga_propria.is.null,etapa_carga_propria.in.(chegou,em_rota,retornou)")
        .lt("data_hora", cutoff)
        .order("data_hora", { ascending: true });
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

  const invalidarCp = () => {
    qc.invalidateQueries({ queryKey: ["admin-cargas-proprias-travadas"] });
    qc.invalidateQueries({ queryKey: ["movimentacoes-portaria"] });
    qc.invalidateQueries({ queryKey: ["motoristas-painel"] });
  };

  const baixaCpPayload = (extra = "") => {
    const agora = new Date().toISOString();
    return {
      etapa_carga_propria: "finalizado" as const,
      horario_saida_final: agora,
      horario_real_retorno: agora,
      observacoes: `[Baixa administrativa - registro antigo sem dados]${extra}`,
    };
  };

  const finalizarUmaCargaPropria = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("movimentacoes_portaria")
        .update(baixaCpPayload())
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro finalizado");
      invalidarCp();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao dar baixa"),
  });

  const finalizarTodasCargasProprias = useMutation({
    mutationFn: async () => {
      const ids = (cargasProprias.data || []).map((f) => f.id);
      if (!ids.length) return;
      const { error } = await supabase
        .from("movimentacoes_portaria")
        .update(baixaCpPayload(" (lote)"))
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Carga Própria travada: baixa concluída");
      invalidarCp();
      setConfirmCargasProprias(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro na baixa em lote"),
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

  const fmtHaQuanto = (s?: string | null) => {
    if (!s) return "—";
    const ms = Date.now() - new Date(s).getTime();
    if (ms < 0) return "—";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    return `${h}h ${m.toString().padStart(2, "0")}min`;
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
            <AlertDialogCancel disabled={finalizarTodosFantasmas.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={finalizarTodosFantasmas.isPending}
              onClick={(e) => {
                if (finalizarTodosFantasmas.isPending) { e.preventDefault(); return; }
                finalizarTodosFantasmas.mutate();
              }}
            >
              {finalizarTodosFantasmas.isPending ? "Finalizando..." : "Confirmar"}
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
            <AlertDialogCancel disabled={excluirTodosEsperados.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={excluirTodosEsperados.isPending}
              onClick={(e) => {
                if (excluirTodosEsperados.isPending) { e.preventDefault(); return; }
                excluirTodosEsperados.mutate();
              }}
            >
              {excluirTodosEsperados.isPending ? "Excluindo..." : "Confirmar exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Carga Própria travada */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Carga Própria travada no pátio
              <Badge variant="destructive" className="ml-1">{cargasProprias.data?.length || 0}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 rounded-md border p-0.5">
                {LIMITES_CP_HORAS.map((h) => (
                  <Button
                    key={h}
                    size="sm"
                    variant={limiteCpHoras === h ? "secondary" : "ghost"}
                    className="h-7 px-2 text-xs"
                    onClick={() => setLimiteCpHoras(h)}
                  >
                    {h >= 168 ? "7d" : `${h}h`}
                  </Button>
                ))}
              </div>
              {(cargasProprias.data?.length || 0) > 0 && (
                <Button size="sm" variant="destructive" onClick={() => setConfirmCargasProprias(true)}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Dar baixa em todos
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Registros de Varejo (Carga Própria) abertos há mais de {limiteCpHoras >= 168 ? "7 dias" : `${limiteCpHoras}h`} —
            "Em Rota", "Chegou", "Retornou" ou estado inconsistente. A baixa finaliza sem exigir KM ou foto.
          </p>
        </CardHeader>
        <CardContent>
          {cargasProprias.isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
            </div>
          ) : (cargasProprias.data?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum registro travado nessa janela. ✨
            </p>
          ) : (
            <div className="space-y-2">
              {cargasProprias.data!.map((f) => (
                <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 p-2 border rounded-md bg-card">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm">{f.placa || "—"}</span>
                      <Badge variant="outline" className="text-[11px] capitalize">
                        {f.etapa_carga_propria || "inconsistente"}
                      </Badge>
                      {f.rota && <Badge variant="secondary" className="text-[11px]">{f.rota}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {f.motorista || "Sem motorista"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Aberto há {fmtHaQuanto(f.horario_real_saida || f.data_hora)} • desde {fmtDate(f.data_hora)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => finalizarUmaCargaPropria.mutate(f.id)}
                    disabled={finalizarUmaCargaPropria.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Dar baixa
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmCargasProprias} onOpenChange={setConfirmCargasProprias}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dar baixa em todos os registros travados?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai finalizar {cargasProprias.data?.length || 0} registros de Carga Própria sem KM/foto,
              removendo-os do Pátio Atual de Varejo. Eles ficam visíveis no Histórico marcados como baixa administrativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finalizarTodasCargasProprias.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={finalizarTodasCargasProprias.isPending}
              onClick={(e) => {
                if (finalizarTodasCargasProprias.isPending) { e.preventDefault(); return; }
                finalizarTodasCargasProprias.mutate();
              }}
            >
              {finalizarTodasCargasProprias.isPending ? "Processando..." : "Confirmar baixa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}