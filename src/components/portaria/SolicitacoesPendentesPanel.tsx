import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogIn, X, Clock, Link2, CheckCircle2, Package, ShieldCheck, Pencil } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useVeiculosWalkInAtivos,
  useAutorizarChegada,
  useRegistrarChegadaPortaria,
  type VeiculoEsperado,
} from "@/hooks/useVeiculosEsperados";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { VincularCargaDialog } from "./VincularCargaDialog";
import { EditarVeiculoEsperadoDialog } from "./EditarVeiculoEsperadoDialog";

interface Props {
  categoria?: "carga_propria" | "terceirizado";
}

export function SolicitacoesPendentesPanel({ categoria }: Props = {}) {
  const { role } = useAuth();
  const { data: ativosRaw = [], isLoading } = useVeiculosWalkInAtivos();
  const autorizar = useAutorizarChegada();
  const registrarChegada = useRegistrarChegadaPortaria();
  const qc = useQueryClient();
  const [recusaId, setRecusaId] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [vincularVeiculo, setVincularVeiculo] = useState<{ id: string; placa: string; motorista?: string | null } | null>(null);
  const [editarVeiculo, setEditarVeiculo] = useState<any | null>(null);

  const canDecide = role === "admin" || role === "logistica";
  const canRegistrarChegada = role === "admin" || role === "logistica" || role === "portaria";

  useEffect(() => {
    const channel = supabase
      .channel("walkin_ativos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "veiculos_esperados" },
        () => {
          qc.invalidateQueries({ queryKey: ["veiculos_walkin_ativos"] });
          qc.invalidateQueries({ queryKey: ["veiculos_esperados_pendentes"] });
          qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const ativos = ativosRaw.filter((v: any) => {
    if (!categoria) return true;
    const grupo = (v.grupo || "").toUpperCase();
    const isPropria = grupo.includes("PROPRIA") || grupo.includes("PRÓPRIA");
    return categoria === "carga_propria" ? isPropria : !isPropria;
  });

  if (isLoading || ativos.length === 0) return null;

  const aguardando = ativos.filter((v) => v.status_autorizacao === "aguardando_vinculo" || v.status_autorizacao === "aguardando_autorizacao");
  const liberados = ativos.filter((v) => v.status_autorizacao === "autorizado");

  const handleRecusar = async () => {
    if (!recusaId) return;
    await autorizar.mutateAsync({ id: recusaId, autorizar: false, motivo: motivoRecusa });
    setRecusaId(null);
    setMotivoRecusa("");
  };

  const renderItem = (v: any, kind: "aguardando" | "liberado") => (
    <div
      key={v.id}
      className="rounded-md border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-bold text-sm">{v.placa}</span>
          {kind === "aguardando" ? (
            <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400">
              AGUARDANDO LIBERAÇÃO
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> LIBERADO
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
            <Clock className="h-3 w-3" />
            Chegou {format(new Date(v.created_at), "HH:mm")} ({formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: ptBR })})
          </Badge>
          {v.carga_id && (
            <Badge variant="secondary" className="text-[10px] h-5 font-mono gap-1">
              <Package className="h-3 w-3" /> Carga {v.carga_id}
            </Badge>
          )}
        </div>

        {kind === "liberado" && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              OK Logística
              {v.autorizado_por_nome || v.autorizado_por_email ? (
                <span className="font-normal opacity-80">
                  · {v.autorizado_por_nome || v.autorizado_por_email}
                </span>
              ) : null}
              {v.autorizado_em && (
                <span className="font-normal opacity-80">
                  · {format(new Date(v.autorizado_em), "dd/MM HH:mm")}
                </span>
              )}
            </Badge>
          </div>
        )}

        <div className="text-xs">
          <span className="text-muted-foreground">Motorista:</span> {v.motorista || "—"}
          {v.transportadora && (
            <> • <span className="text-muted-foreground">Transp.:</span> {v.transportadora}</>
          )}
        </div>
        {(v.tipo_veiculo || v.destino) && (
          <div className="text-xs text-muted-foreground">
            {v.tipo_veiculo && <>Veículo: {v.tipo_veiculo}</>}
            {v.tipo_veiculo && v.destino && " • "}
            {v.destino && <>Destino: {v.destino}</>}
          </div>
        )}
        {v.observacoes && (
          <div className="text-xs italic text-muted-foreground">"{v.observacoes}"</div>
        )}
      </div>

      {kind === "aguardando" ? (
        canDecide ? (
          <div className="flex flex-col gap-1.5 shrink-0 sm:items-end">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={() => setEditarVeiculo(v)}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setVincularVeiculo({ id: v.id, placa: v.placa, motorista: v.motorista })}
              >
                <Link2 className="h-3.5 w-3.5" /> Vincular a carga
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-xs gap-1"
                onClick={() => setRecusaId(v.id)}
                disabled={autorizar.isPending}
              >
                <X className="h-3.5 w-3.5" /> Recusar
              </Button>
            </div>
            <span className="text-[10px] text-muted-foreground">Vincule uma carga para liberar a entrada</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1 shrink-0 sm:items-end">
            <Badge variant="secondary" className="text-[10px]">Aguardando Logística</Badge>
            <span className="text-[10px] text-muted-foreground text-right">
              Aguardando Logística vincular carga para liberar entrada
            </span>
          </div>
        )
      ) : canRegistrarChegada ? (
        <div className="flex flex-col gap-1 shrink-0 sm:items-end">
          <Button
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => registrarChegada.mutate(v)}
            disabled={registrarChegada.isPending}
          >
            <LogIn className="h-3.5 w-3.5" /> Liberar Entrada no Pátio
          </Button>
          <span className="text-[10px] text-muted-foreground text-right">
            Logística autorizou — confirme entrada física do veículo
          </span>
        </div>
      ) : (
        <Badge variant="secondary" className="text-[10px] shrink-0">Aguardando Portaria</Badge>
      )}
    </div>
  );

  return (
    <>
      {aguardando.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <LogIn className="h-4 w-4 text-primary" />
              Aguardando vínculo da Logística
              <Badge variant="outline" className="text-[10px] h-5 border-primary/40 bg-primary/10 text-primary">
                {aguardando.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {aguardando.map((v) => renderItem(v, "aguardando"))}
          </CardContent>
        </Card>
      )}

      {liberados.length > 0 && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Carga vinculada — clique para liberar entrada no pátio
              <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                {liberados.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {liberados.map((v) => renderItem(v, "liberado"))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!recusaId} onOpenChange={(o) => { if (!o) { setRecusaId(null); setMotivoRecusa(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recusar entrada</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo da recusa</Label>
            <Textarea
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              placeholder="Ex.: sem agendamento, fora do horário..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRecusaId(null); setMotivoRecusa(""); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRecusar} disabled={autorizar.isPending}>
              Confirmar recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VincularCargaDialog
        open={!!vincularVeiculo}
        onOpenChange={(o) => { if (!o) setVincularVeiculo(null); }}
        veiculoEsperado={vincularVeiculo}
      />

      <EditarVeiculoEsperadoDialog
        open={!!editarVeiculo}
        onOpenChange={(o) => { if (!o) setEditarVeiculo(null); }}
        veiculo={editarVeiculo}
      />
    </>
  );
}
