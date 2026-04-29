import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Truck, LogIn, Clock, UserCheck, DoorOpen, Undo2, Hourglass, AlertOctagon } from "lucide-react";
import { useCargasFechadasAguardando, type CargaFechadaAguardando } from "@/hooks/useCarregamentos";
import { RegistroEntradaDialog } from "./RegistroEntradaDialog";
import { CancelarCargaDialog } from "./CancelarCargaDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  /** Filter by carga categoria (PRÓPRIA = sem transportadora; TERCEIRIZADO = com transportadora) */
  categoria?: "carga_propria" | "terceirizado";
}

export function CargasFechadasAguardandoPanel({ categoria }: Props = {}) {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const { data: cargasRaw = [], isLoading } = useCargasFechadasAguardando();
  const [prefill, setPrefill] = useState<CargaFechadaAguardando | null>(null);
  const [grupoDialog, setGrupoDialog] = useState<"PRÓPRIA" | "TERCEIRIZADO" | null>(null);
  const [cancelCarga, setCancelCarga] = useState<CargaFechadaAguardando | null>(null);
  const [walkInIds, setWalkInIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const canAct = role === "admin" || role === "logistica" || role === "portaria";

  const cargas = cargasRaw.filter((c) => {
    if (!categoria) return true;
    const isPropria = !c.transportadora;
    return categoria === "carga_propria" ? isPropria : !isPropria;
  });

  // Identifica quais cargas vieram de um walk-in já no pátio
  useEffect(() => {
    const ids = cargas.map((c) => c.carga_id).filter(Boolean);
    if (ids.length === 0) {
      setWalkInIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      // "Motorista já no pátio" = existe movimentação de entrada com horario_entrada preenchido
      // (não basta veiculo_esperado autorizado; ele pode estar apenas aguardando liberação)
      const { data } = await supabase
        .from("movimentacoes_portaria")
        .select("carga_id, horario_entrada")
        .in("carga_id", ids)
        .eq("tipo_movimento", "entrada")
        .not("horario_entrada", "is", null);
      if (cancelled) return;
      const set = new Set<string>(
        ((data ?? []) as unknown as { carga_id: string | null }[])
          .map((r) => r.carga_id)
          .filter((v): v is string => !!v)
      );
      setWalkInIds(set);
    })();
    return () => { cancelled = true; };
  }, [cargas.map((c) => c.carga_id).join("|")]);

  // Cronômetro vivo para "aguardando liberação"
  useEffect(() => {
    const hasWaiting = cargas.some((c) => c.chegouAguardandoLiberacao);
    if (!hasWaiting) return;
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [cargas.some((c) => c.chegouAguardandoLiberacao)]);

  if (isLoading || cargas.length === 0) return null;

  const openRegistro = (c: CargaFechadaAguardando, grupo: "PRÓPRIA" | "TERCEIRIZADO") => {
    setPrefill(c);
    setGrupoDialog(grupo);
  };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
    qc.invalidateQueries({ queryKey: ["cargas_fechadas_aguardando"] });
    qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
    qc.invalidateQueries({ queryKey: ["carregamentos"] });
    qc.invalidateQueries({ queryKey: ["status_portaria_por_carga"] });
  };

  const liberarEntrada = async (c: CargaFechadaAguardando) => {
    if (!c.movimentoChegadaId) return;
    setBusyId(c.carga_id);
    try {
      const nowIso = new Date().toISOString();
      const isPropria = !c.transportadora;
      const update: Record<string, any> = { horario_entrada: nowIso };
      if (isPropria) update.etapa_carga_propria = "chegou";
      else update.etapa_terceirizado = "no_patio";
      const { error } = await supabase
        .from("movimentacoes_portaria")
        .update(update as any)
        .eq("id", c.movimentoChegadaId);
      if (error) throw error;
      // Marca veiculo_esperado como conferido só agora (entrou de fato)
      await supabase
        .from("veiculos_esperados" as any)
        .update({
          conferido: true,
          conferido_por: user?.id ?? null,
          conferido_em: nowIso,
        } as any)
        .eq("carga_id", c.carga_id);
      toast.success("Entrada liberada — veículo no pátio");
      invalidateAll();
    } catch (e: any) {
      toast.error(e.message || "Erro ao liberar entrada");
    } finally {
      setBusyId(null);
    }
  };

  const desfazerChegada = async (c: CargaFechadaAguardando) => {
    if (!c.movimentoChegadaId) return;
    if (!confirm("Desfazer a chegada deste motorista? O registro será apagado.")) return;
    setBusyId(c.carga_id);
    try {
      const { error } = await supabase
        .from("movimentacoes_portaria")
        .delete()
        .eq("id", c.movimentoChegadaId)
        .is("horario_entrada", null);
      if (error) throw error;
      toast.success("Chegada desfeita");
      invalidateAll();
    } catch (e: any) {
      toast.error(e.message || "Erro ao desfazer chegada");
    } finally {
      setBusyId(null);
    }
  };

  const formatHora = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };
  const minutosDesde = (iso: string) => {
    try {
      return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
    } catch { return 0; }
  };

  return (
    <>
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Cargas fechadas aguardando veículo
            <Badge variant="outline" className="text-[10px] h-5 border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400">
              {cargas.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {cargas.map((c) => {
            const grupo: "PRÓPRIA" | "TERCEIRIZADO" = c.transportadora ? "TERCEIRIZADO" : "PRÓPRIA";
            const isWalkIn = !!c.carga_id && walkInIds.has(c.carga_id);
            const aguardandoLib = !!c.chegouAguardandoLiberacao;
            const minEspera = c.horarioChegada ? minutosDesde(c.horarioChegada) : 0;
            const isBusy = busyId === c.carga_id;
            return (
              <div key={c.carga_id} className="rounded-md border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm truncate">
                      {c.nome_carga || c.carga_id}
                    </span>
                    {aguardandoLib ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 gap-0.5 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      >
                        <Hourglass className="h-3 w-3" /> Aguardando liberação
                        {c.horarioChegada && (
                          <span className="ml-1 font-mono">
                            · {formatHora(c.horarioChegada)} ({minEspera}min)
                          </span>
                        )}
                      </Badge>
                    ) : isWalkIn && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 gap-0.5 border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      >
                        <UserCheck className="h-3 w-3" /> Motorista já no pátio
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] h-5 font-mono">
                      <Package className="h-3 w-3 mr-1" />
                      {c.qtd_pedidos} {c.qtd_pedidos === 1 ? "pedido" : "pedidos"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {c.peso_total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
                      <Clock className="h-3 w-3" /> {c.data}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    {c.placa && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" /> Placa prevista: <span className="font-mono font-medium text-foreground">{c.placa}</span>
                      </span>
                    )}
                    {c.motorista && <span>Motorista: <span className="text-foreground">{c.motorista}</span></span>}
                    {c.transportadora && <span>Transp.: <span className="text-foreground">{c.transportadora}</span></span>}
                    {c.tipo_caminhao && <span>Tipo: {c.tipo_caminhao}</span>}
                  </div>
                </div>

                {canAct && (
                  <div className="flex flex-col gap-1.5 shrink-0 sm:items-end">
                    {aguardandoLib ? (
                      <>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
                            disabled={isBusy}
                            onClick={() => desfazerChegada(c)}
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            Desfazer chegada
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-600/90 text-white"
                            disabled={isBusy}
                            onClick={() => liberarEntrada(c)}
                          >
                            <DoorOpen className="h-3.5 w-3.5" />
                            Liberar entrada no pátio
                          </Button>
                        </div>
                        <span className="text-[10px] text-muted-foreground text-right">
                          Motorista chegou — aguardando autorização para entrar
                        </span>
                      </>
                    ) : (
                      <>
                        <Button size="sm" className="h-8 text-xs gap-1" onClick={() => openRegistro(c, grupo)}>
                          <LogIn className="h-3.5 w-3.5" />
                          {isWalkIn ? "Confirmar entrada do motorista" : "Registrar chegada do veículo"}
                        </Button>
                        <span className="text-[10px] text-muted-foreground text-right">
                          {isWalkIn ? "Motorista já está no pátio" : "1º passo — depois libera para o pátio"}
                        </span>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setCancelCarga(c)}
                      disabled={isBusy}
                    >
                      <AlertOctagon className="h-3.5 w-3.5" />
                      Cancelar carga
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {grupoDialog && prefill && (
        <RegistroEntradaDialog
          open={!!grupoDialog}
          onOpenChange={(o) => { if (!o) { setGrupoDialog(null); setPrefill(null); } }}
          grupo={grupoDialog}
          prefill={{
            placa: prefill.placa || "",
            motorista: prefill.motorista || "",
            transportadora: prefill.transportadora || undefined,
            tipo_veiculo: prefill.tipo_caminhao || undefined,
            carga_id: prefill.carga_id,
          }}
        />
      )}
      {cancelCarga && (
        <CancelarCargaDialog
          open={!!cancelCarga}
          onOpenChange={(o) => { if (!o) setCancelCarga(null); }}
          carga={cancelCarga}
        />
      )}
    </>
  );
}
