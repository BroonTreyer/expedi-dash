import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogIn, X, Clock, Link2, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
import { Link } from "react-router-dom";

export function SolicitacoesPendentesPanel() {
  const { role } = useAuth();
  const { data: ativos = [], isLoading } = useVeiculosWalkInAtivos();
  const autorizar = useAutorizarChegada();
  const registrarChegada = useRegistrarChegadaPortaria();
  const qc = useQueryClient();
  const [recusaId, setRecusaId] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");

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

  if (isLoading || ativos.length === 0) return null;

  const aguardando = ativos.filter((v) => v.status_autorizacao === "aguardando_vinculo" || v.status_autorizacao === "aguardando_autorizacao");
  const liberados = ativos.filter((v) => v.status_autorizacao === "autorizado");

  const handleRecusar = async () => {
    if (!recusaId) return;
    await autorizar.mutateAsync({ id: recusaId, autorizar: false, motivo: motivoRecusa });
    setRecusaId(null);
    setMotivoRecusa("");
  };

  const renderItem = (v: VeiculoEsperado, kind: "aguardando" | "liberado") => (
    <div
      key={v.id}
      className="rounded-md border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-bold text-sm">{v.placa}</span>
          {kind === "aguardando" ? (
            <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400">
              NO PÁTIO
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> LIBERADO
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: ptBR })}
          </Badge>
          {v.carga_id && (
            <Badge variant="secondary" className="text-[10px] h-5 font-mono">
              Carga {v.carga_id}
            </Badge>
          )}
        </div>
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
          <div className="flex gap-2 shrink-0">
            <Button asChild size="sm" className="h-8 text-xs gap-1">
              <Link to="/">
                <Link2 className="h-3.5 w-3.5" /> Vincular a carga
              </Link>
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
        ) : (
          <Badge variant="secondary" className="text-[10px] shrink-0">Aguardando Logística</Badge>
        )
      ) : canRegistrarChegada ? (
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => registrarChegada.mutate(v)}
            disabled={registrarChegada.isPending}
          >
            <LogIn className="h-3.5 w-3.5" /> Liberar Entrada
          </Button>
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
              Liberados — aguardando liberação de entrada
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
    </>
  );
}
