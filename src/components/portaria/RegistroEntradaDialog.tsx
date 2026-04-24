import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MotoristaAutocomplete } from "./MotoristaAutocomplete";
import { CaminhaoAutocomplete } from "./CaminhaoAutocomplete";
import { useRegistrarChegadaWalkIn } from "@/hooks/useVeiculosEsperados";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, Package } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Prefill {
  placa?: string;
  motorista?: string;
  transportadora?: string;
  tipo_veiculo?: string;
  /** Se presente, vincula a entrada diretamente a esta carga (cria movimentação de portaria + marca veiculo_esperado conferido) */
  carga_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  grupo: "PRÓPRIA" | "TERCEIRIZADO";
  prefill?: Prefill;
}

export function RegistroEntradaDialog({ open, onOpenChange, grupo, prefill }: Props) {
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const [transportadora, setTransportadora] = useState<string | undefined>(undefined);
  const [tipoVeiculo, setTipoVeiculo] = useState<string | undefined>(undefined);
  const [placaSelecionada, setPlacaSelecionada] = useState(false);
  const [motoristaSelecionado, setMotoristaSelecionado] = useState(false);
  const [vinculandoCarga, setVinculandoCarga] = useState(false);

  const mut = useRegistrarChegadaWalkIn();
  const { user } = useAuth();
  const qc = useQueryClient();

  const cargaId = prefill?.carga_id || null;
  const isVinculadoACarga = !!cargaId;

  // Hidrata estado quando prefill muda / dialog abre
  useEffect(() => {
    if (!open) return;
    if (prefill) {
      if (prefill.placa) { setPlaca(prefill.placa); setPlacaSelecionada(true); }
      if (prefill.motorista) { setMotorista(prefill.motorista); setMotoristaSelecionado(true); }
      if (prefill.transportadora) setTransportadora(prefill.transportadora);
      if (prefill.tipo_veiculo) setTipoVeiculo(prefill.tipo_veiculo);
    }
  }, [open, prefill]);

  const reset = () => {
    setPlaca("");
    setMotorista("");
    setTransportadora(undefined);
    setTipoVeiculo(undefined);
    setPlacaSelecionada(false);
    setMotoristaSelecionado(false);
  };

  const handleSelectMotorista = (m: { nome_completo: string; transportadora?: string | null; tipo_caminhao?: string | null }) => {
    setMotorista(m.nome_completo);
    setMotoristaSelecionado(true);
    if (m.transportadora && !transportadora) setTransportadora(m.transportadora);
    if (m.tipo_caminhao && !tipoVeiculo) setTipoVeiculo(m.tipo_caminhao);
  };

  const handleSelectCaminhao = (c: {
    placa: string;
    tipo_caminhao?: string;
    motorista?: string;
    transportadora?: string;
  }) => {
    setPlaca(c.placa);
    setPlacaSelecionada(true);
    if (c.tipo_caminhao) setTipoVeiculo(c.tipo_caminhao);
    if (c.transportadora) setTransportadora(c.transportadora);
    if (c.motorista && !motorista) {
      setMotorista(c.motorista);
      setMotoristaSelecionado(true);
    }
  };

  /**
   * Caso vinculado a carga: cria diretamente a movimentação de portaria (entrada)
   * e atualiza placa/motorista nas linhas da carga (caso veículo seja diferente do previsto).
   */
  const handleSubmitVinculadoACarga = async () => {
    if (!cargaId) return;
    setVinculandoCarga(true);
    try {
      const isCargaPropria = grupo === "PRÓPRIA";
      const categoria = isCargaPropria ? "carga_propria" : "terceirizado";
      const nowIso = new Date().toISOString();

      const movPayload: Record<string, any> = {
        tipo_movimento: "entrada",
        categoria,
        placa: placa.trim().toUpperCase(),
        motorista: motorista.trim(),
        tipo_caminhao: tipoVeiculo,
        carga_id: cargaId,
        horario_entrada: nowIso,
        horario_chegada: nowIso,
        data_hora: nowIso,
        usuario_id: user?.id ?? null,
      };
      if (categoria === "terceirizado") {
        movPayload.empresa = transportadora;
        movPayload.etapa_terceirizado = "no_patio";
      } else {
        movPayload.etapa_carga_propria = "chegou";
      }
      const { error: movErr } = await supabase
        .from("movimentacoes_portaria")
        .insert(movPayload as any);
      if (movErr) throw movErr;

      // Atualiza placa/motorista nas linhas da carga (caso o veículo real seja diferente do previsto)
      const updateData: Record<string, any> = { placa: placa.trim().toUpperCase() };
      if (motorista.trim()) updateData.motorista = motorista.trim();
      await supabase.from("carregamentos_dia").update(updateData).eq("carga_id", cargaId);

      // Marca eventual veiculo_esperado dessa carga como conferido
      await supabase
        .from("veiculos_esperados" as any)
        .update({
          conferido: true,
          conferido_por: user?.id ?? null,
          conferido_em: nowIso,
          status_autorizacao: "autorizado",
          autorizado_por: user?.id ?? null,
          autorizado_em: nowIso,
          carga_id: cargaId,
        } as any)
        .eq("carga_id", cargaId);

      toast.success("Entrada registrada e vinculada à carga");
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      qc.invalidateQueries({ queryKey: ["cargas_fechadas_aguardando"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_ativos"] });
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_pendentes_count"] });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao registrar chegada");
    } finally {
      setVinculandoCarga(false);
    }
  };

  const handleSubmit = async () => {
    if (!placaSelecionada || !motoristaSelecionado) return;
    if (isVinculadoACarga) {
      await handleSubmitVinculadoACarga();
      return;
    }
    await mut.mutateAsync({
      placa: placa.trim(),
      motorista: motorista.trim(),
      transportadora: transportadora || undefined,
      tipo_veiculo: tipoVeiculo || undefined,
      grupo: grupo === "PRÓPRIA" ? "WALK-IN-PROPRIA" : "WALK-IN-TERCEIRIZADO",
    });
    reset();
    onOpenChange(false);
  };

  const isPending = mut.isPending || vinculandoCarga;
  const canSubmit = placaSelecionada && motoristaSelecionado && !isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" />
            Registrar Entrada — {grupo === "PRÓPRIA" ? "Frota Própria" : "Terceirizado"}
          </DialogTitle>
          <DialogDescription>
            {isVinculadoACarga
              ? "Veículo será vinculado diretamente à carga selecionada e entra no pátio."
              : "Vincule motorista e veículo já cadastrados. O veículo ficará disponível para a Logística vincular ao fechar uma carga."}
          </DialogDescription>
        </DialogHeader>

        {isVinculadoACarga && (
          <Badge variant="secondary" className="w-fit text-xs gap-1">
            <Package className="h-3 w-3" />
            Vinculado à carga: <span className="font-mono">{cargaId}</span>
          </Badge>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Buscar motorista *</Label>
            <MotoristaAutocomplete
              value={motorista}
              onChange={(v) => {
                setMotorista(v);
                setMotoristaSelecionado(false);
              }}
              onSelect={handleSelectMotorista}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Buscar veículo (placa) *</Label>
            <CaminhaoAutocomplete
              value={placa}
              onChange={(v) => {
                setPlaca(v);
                setPlacaSelecionada(false);
              }}
              onSelect={handleSelectCaminhao}
            />
          </div>

          <p className="text-xs text-muted-foreground border-t pt-3">
            Motorista ou veículo não encontrado? Cadastre primeiro em <span className="font-medium text-foreground">Cadastros → Motoristas / Caminhões</span> e tente novamente.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? "Registrando..." : isVinculadoACarga ? "Confirmar entrada na carga" : "Registrar Entrada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
