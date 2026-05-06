import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BellRing, Hourglass, Weight, Trash2 } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
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

const fmtKg = (n: number | null | undefined) =>
  n != null ? `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg` : null;

/** Acima desse limite, destacamos visualmente a espera (mas não escondemos). */
const ALERTA_AGUARDANDO_MINUTOS = 6 * 60;

export function PainelChegou({ movimentacoes, now }: Props) {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const canDescartar = role === "admin" || role === "logistica" || role === "portaria";

  const lista = movimentacoes
    .filter(
      (m) =>
        m.categoria === "terceirizado" &&
        m.tipo_movimento === "entrada" &&
        !m.horario_entrada &&
        (m.etapa_terceirizado === "chegada" || !!m.horario_chegada),
    )
    .filter((m) => {
      // Esconde chegada órfã se já existe outro movimento posterior da mesma
      // placa (motorista voltou e cumpriu novo ciclo de carga).
      const placa = (m.placa || "").trim().toUpperCase();
      if (!placa) return true;
      const t = new Date(m.horario_chegada || m.data_hora).getTime();
      const temPosterior = movimentacoes.some(
        (x) =>
          x.id !== m.id &&
          (x.placa || "").trim().toUpperCase() === placa &&
          new Date(x.data_hora).getTime() > t,
      );
      return !temPosterior;
    })
    .sort(
      (a, b) =>
        new Date(a.horario_chegada || a.data_hora).getTime() -
        new Date(b.horario_chegada || b.data_hora).getTime()
    );

  const descartarChegada = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await supabase
        .from("movimentacoes_portaria")
        .delete()
        .eq("id", id)
        .is("horario_entrada", null);
      if (error) throw error;
      toast.success("Chegada descartada");
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes_ativas_patio"] });
      qc.invalidateQueries({ queryKey: ["cargas_fechadas_aguardando"] });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao descartar chegada");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="overflow-hidden border-sidebar/30 shadow-sm">
      <CardHeader className="py-3 px-4 bg-sidebar text-sidebar-foreground">
        <CardTitle className="text-base flex items-center gap-2 font-bold">
          <BellRing className="h-5 w-5" />
          Chegou — aguardando liberação
          <Badge className="ml-auto bg-white text-sidebar hover:bg-white text-sm font-bold px-2.5">
            {lista.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Ninguém aguardando entrada</p>
        ) : (
          lista.map((m, idx) => {
            const ref = new Date(m.horario_chegada || m.data_hora);
            const min = differenceInMinutes(now, ref);
            const longaEspera = min >= ALERTA_AGUARDANDO_MINUTOS;
            const kg = fmtKg(m.peso);
            return (
              <div
                key={m.id}
                className={`rounded-md border border-l-4 ${longaEspera ? "border-l-destructive" : "border-l-amber-500"} ${idx % 2 === 0 ? "bg-background" : "bg-muted/40"} p-3 flex flex-col sm:flex-row sm:items-center gap-2`}
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
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`text-sm font-bold whitespace-nowrap rounded-full px-3 py-1.5 inline-flex items-center gap-1 ${longaEspera ? "bg-destructive text-destructive-foreground" : "bg-amber-500 text-black"}`}>
                    <Hourglass className="h-4 w-4" />
                    {format(ref, "HH:mm")} · {formatTempo(min)}
                  </div>
                  {canDescartar && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Descartar chegada (registro duplicado / engano)"
                          disabled={busyId === m.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Descartar chegada?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Use apenas se este registro foi criado por engano ou está duplicado
                            (o motorista já entrou no pátio por outro registro).
                            <br />
                            <span className="font-medium text-foreground">
                              Placa {m.placa} · {m.motorista || "sem motorista"} · chegou {format(ref, "HH:mm")}
                            </span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={busyId === m.id}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={busyId === m.id}
                            onClick={(e) => {
                              if (busyId === m.id) { e.preventDefault(); return; }
                              descartarChegada(m.id);
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {busyId === m.id ? "Descartando..." : "Descartar"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
