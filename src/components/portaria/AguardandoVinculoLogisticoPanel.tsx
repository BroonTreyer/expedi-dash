import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Hourglass, Link2, Ban, Clock, Loader2 } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useMovimentacoesAtivasPatio,
  useUpdateMovimentacao,
  type MovimentacaoPortaria,
} from "@/hooks/useMovimentacoesPortaria";
import { useAuth } from "@/hooks/useAuth";
import { VincularMovimentoCargaDialog } from "./VincularMovimentoCargaDialog";

function formatTempo(min: number) {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

/**
 * Lista terceirizados que registraram chegada mas ainda NÃO têm carga vinculada
 * pela Logística. Esses veículos NÃO devem aparecer no Pátio Atual.
 * Apenas Logística/Admin podem vincular carga ou cancelar a chegada.
 * A Portaria vê o cartão em modo informativo.
 */
export function AguardandoVinculoLogisticoPanel() {
  const { role } = useAuth();
  const { data: ativas = [] } = useMovimentacoesAtivasPatio();
  const updateMov = useUpdateMovimentacao();
  const [vincularMov, setVincularMov] = useState<MovimentacaoPortaria | null>(null);
  const [cancelarMov, setCancelarMov] = useState<MovimentacaoPortaria | null>(null);
  const [now, setNow] = useState(() => new Date());

  const canAct = role === "admin" || role === "logistica";

  const items = useMemo(() => {
    return ativas.filter(
      (m) =>
        m.categoria === "terceirizado" &&
        m.etapa_terceirizado === "chegada" &&
        !m.horario_entrada &&
        !m.carga_id
    );
  }, [ativas]);

  // Cronômetro vivo
  useEffect(() => {
    if (items.length === 0) return;
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;

  const handleCancelar = async () => {
    if (!cancelarMov) return;
    const obs = [
      cancelarMov.observacoes,
      `Chegada cancelada — sem vínculo logístico (${format(new Date(), "dd/MM/yyyy HH:mm")})`,
    ]
      .filter(Boolean)
      .join(" | ");
    await updateMov.mutateAsync({
      id: cancelarMov.id,
      etapa_terceirizado: "finalizado",
      horario_saida_final: new Date().toISOString(),
      observacoes: obs,
    } as any);
    setCancelarMov(null);
  };

  return (
    <>
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Hourglass className="h-4 w-4" />
            Aguardando Vínculo Logístico
            <Badge variant="outline" className="ml-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              {items.length}
            </Badge>
          </CardTitle>
          {!canAct && (
            <span className="text-xs text-muted-foreground">
              Aguardando ação da Logística
            </span>
          )}
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {items.map((m) => {
            const minutos = differenceInMinutes(now, new Date(m.horario_chegada || m.data_hora));
            return (
              <div
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-md bg-background border border-border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm">{m.placa || "—"}</span>
                    <Badge variant="outline" className="text-[10px] h-5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      Sem carga vinculada
                    </Badge>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> há {formatTempo(minutos)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {m.motorista || "Motorista não informado"}
                    {m.empresa && <> · {m.empresa}</>}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Chegada: {format(new Date(m.horario_chegada || m.data_hora), "dd/MM HH:mm", { locale: ptBR })}
                  </div>
                </div>
                <div className="flex gap-2 sm:justify-end">
                  {canAct ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8 text-xs"
                        onClick={() => setCancelarMov(m)}
                        disabled={updateMov.isPending}
                      >
                        <Ban className="h-3.5 w-3.5" /> Cancelar chegada
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5 h-8 text-xs"
                        onClick={() => setVincularMov(m)}
                      >
                        <Link2 className="h-3.5 w-3.5" /> Vincular Carga
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Aguardando vínculo de carga pela Logística
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <VincularMovimentoCargaDialog
        open={!!vincularMov}
        onOpenChange={(o) => { if (!o) setVincularMov(null); }}
        movimento={vincularMov}
      />

      <AlertDialog open={!!cancelarMov} onOpenChange={(o) => { if (!o) setCancelarMov(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar chegada sem vínculo?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelarMov && (
                <>
                  A chegada de <strong className="font-mono">{cancelarMov.placa}</strong>
                  {cancelarMov.motorista && <> ({cancelarMov.motorista})</>} será encerrada
                  e sairá desta fila. O registro fica preservado no Histórico.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMov.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelar} disabled={updateMov.isPending} className="gap-2">
              {updateMov.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}