import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParkingCircle, AlertTriangle, Weight, LogOut } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
  now: Date;
}

function formatTempo(min: number) {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

function tempoPill(min: number) {
  if (min >= 480) return "bg-sidebar text-sidebar-foreground animate-pulse";
  if (min >= 240) return "bg-amber-500 text-black";
  return "bg-emerald-600 text-white";
}

function borderClass(min: number) {
  if (min >= 480) return "border-l-sidebar";
  if (min >= 240) return "border-l-amber-500";
  return "border-l-emerald-600";
}

const fmtKg = (n: number | null | undefined) =>
  n != null ? `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg` : null;

export function PainelNoPatio({ movimentacoes, now }: Props) {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const canDesistir = role === "admin" || role === "logistica" || role === "portaria";

  const marcarSaiuSemCarregar = async (m: MovimentacaoPortaria) => {
    setBusyId(m.id);
    try {
      const stamp = format(new Date(), "dd/MM/yyyy HH:mm");
      const quem = user?.email || "sistema";
      const linha = `[${stamp}] Saiu sem carregar — ${quem}${motivo.trim() ? `: ${motivo.trim()}` : ""}`;
      const novasObs = [m.observacoes?.trim(), linha].filter(Boolean).join("\n");
      const { error } = await supabase
        .from("movimentacoes_portaria")
        .update({
          etapa_terceirizado: "finalizado",
          horario_saida_final: new Date().toISOString(),
          observacoes: novasObs,
        })
        .eq("id", m.id);
      if (error) throw error;
      toast.success("Veículo encerrado como 'Saiu sem carregar'");
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes_ativas_patio"] });
      qc.invalidateQueries({ queryKey: ["cargas_fechadas_aguardando"] });
      setOpenId(null);
      setMotivo("");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao encerrar veículo");
    } finally {
      setBusyId(null);
    }
  };

  const lista = movimentacoes
    .filter(
      (m) =>
        m.categoria === "terceirizado" &&
        m.tipo_movimento === "entrada" &&
        m.horario_entrada &&
        m.etapa_terceirizado !== "finalizado"
    )
    .sort(
      (a, b) =>
        new Date(a.horario_entrada || a.data_hora).getTime() -
        new Date(b.horario_entrada || b.data_hora).getTime()
    );

  return (
    <Card className="overflow-hidden border-sidebar/30 shadow-sm">
      <CardHeader className="py-3 px-4 bg-sidebar text-sidebar-foreground">
        <CardTitle className="text-base flex items-center gap-2 font-bold">
          <ParkingCircle className="h-5 w-5" />
          No Pátio
          <Badge className="ml-auto bg-white text-sidebar hover:bg-white text-sm font-bold px-2.5">
            {lista.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum veículo no pátio</p>
        ) : (
          lista.map((m, idx) => {
            const ref = new Date(m.horario_entrada || m.data_hora);
            const min = differenceInMinutes(now, ref);
            const kg = fmtKg(m.peso);
            return (
              <div
                key={m.id}
                className={`rounded-md border border-l-4 ${borderClass(min)} ${idx % 2 === 0 ? "bg-background" : "bg-muted/40"} p-3 flex flex-col sm:flex-row sm:items-center gap-2`}
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-extrabold text-base sm:text-lg">{m.placa || "—"}</span>
                    {m.carga_id && (
                      <Badge variant="secondary" className="text-xs h-6 font-mono">{m.carga_id}</Badge>
                    )}
                    {kg && (
                      <Badge variant="outline" className="text-xs h-6 gap-1 border-sidebar/40 text-foreground">
                        <Weight className="h-3 w-3" /> {kg}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    {m.motorista && <span>Motorista: <span className="text-foreground font-medium">{m.motorista}</span></span>}
                    {m.empresa && <span>Transp.: <span className="text-foreground font-medium">{m.empresa}</span></span>}
                    {m.tipo_caminhao && <span>Tipo: <span className="text-foreground">{m.tipo_caminhao}</span></span>}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                    <span>Chegada: <strong className="text-foreground">{format(new Date(m.horario_chegada || m.data_hora), "dd/MM HH:mm")}</strong></span>
                    {m.horario_entrada && <span>Entrada: <strong className="text-foreground">{format(new Date(m.horario_entrada), "dd/MM HH:mm")}</strong></span>}
                  </div>
                </div>
                <div className={`text-sm font-bold whitespace-nowrap rounded-full px-3 py-1.5 inline-flex items-center gap-1 ${tempoPill(min)}`}>
                  {min >= 480 && <AlertTriangle className="h-4 w-4" />}
                  {formatTempo(min)} no pátio
                </div>
                {canDesistir && (
                  <AlertDialog
                    open={openId === m.id}
                    onOpenChange={(o) => {
                      if (!o) { setOpenId(null); setMotivo(""); }
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        title="Saiu sem carregar (desistiu)"
                        onClick={() => setOpenId(m.id)}
                        disabled={busyId === m.id}
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Saiu sem carregar?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Use quando o motorista entrou no pátio mas foi embora sem carregar.
                          O registro será encerrado (mantido no histórico) e sairá do pátio.
                          <br />
                          <span className="font-medium text-foreground">
                            Placa {m.placa || "—"} · {m.motorista || "sem motorista"} · {formatTempo(min)} no pátio
                          </span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor={`motivo-${m.id}`}>Motivo (opcional)</Label>
                        <Textarea
                          id={`motivo-${m.id}`}
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          placeholder="Ex.: desistiu, problema mecânico, sem carga disponível..."
                          rows={3}
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={busyId === m.id}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={busyId === m.id}
                          onClick={(e) => {
                            if (busyId === m.id) { e.preventDefault(); return; }
                            marcarSaiuSemCarregar(m);
                          }}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          {busyId === m.id ? "Encerrando..." : "Confirmar saída"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
