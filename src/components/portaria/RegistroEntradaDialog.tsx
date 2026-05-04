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
import { buildCargaPropriaPayload } from "@/lib/carga-propria-criar";

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

  // C5 — janela de dedup parametrizada (default 12h, justificada).
  // Antes era 4h hardcoded; subimos para 12h porque há cargas que entram
  // tarde da noite e o motorista chega no dia seguinte sem nova carga vinculada.
  // Depois de 12h, considera-se que é uma chegada nova e cria registro novo.
  const DEDUP_WINDOW_HOURS = 12;

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
    // B4 — em CP, transportadora não se aplica.
    if (m.transportadora && !transportadora && grupo === "TERCEIRIZADO") setTransportadora(m.transportadora);
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
    // B4 — Walk-in/CP NÃO recebe transportadora. Se a placa pertence à
    // frota própria (sem transportadora), não preenchemos. Se tem
    // transportadora vinda do cadastro do caminhão, ela só importa para
    // grupo TERCEIRIZADO.
    if (c.transportadora && grupo === "TERCEIRIZADO") setTransportadora(c.transportadora);
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

      const placaNorm = placa.trim().toUpperCase();
      const motoristaNorm = motorista.trim();

      // C5 — janela parametrizada (vide DEDUP_WINDOW_HOURS no topo do componente).
      const sinceWindow = new Date(Date.now() - DEDUP_WINDOW_HOURS * 3600_000).toISOString();
      const { data: pendentes } = await supabase
        .from("movimentacoes_portaria")
        .select("id, carga_id")
        .eq("tipo_movimento", "entrada")
        .ilike("placa", placaNorm)
        .is("horario_entrada", null)
        .gte("data_hora", sinceWindow)
        .order("data_hora", { ascending: false });
      const reaproveitar = (pendentes ?? []).find(
        (p: any) => !p.carga_id || p.carga_id === cargaId,
      ) as { id: string; carga_id: string | null } | undefined;

      let movPayload: Record<string, any>;
      if (isCargaPropria) {
        movPayload = buildCargaPropriaPayload({
          placa: placaNorm,
          motorista: motoristaNorm,
          tipo_caminhao: tipoVeiculo,
          carga_id: cargaId,
          // B6 — em CP, transportadora não se aplica. Mas se o operador
          // preencheu por engano, propagamos para `empresa` para não
          // perder a informação (será visível na edição/auditoria).
          empresa: transportadora || null,
          usuario_id: user?.id ?? null,
          horarioChegadaIso: nowIso,
        });
      } else {
        movPayload = {
          tipo_movimento: "entrada",
          categoria,
          placa: placaNorm,
          motorista: motoristaNorm,
          tipo_caminhao: tipoVeiculo,
          carga_id: cargaId,
          empresa: transportadora,
          etapa_terceirizado: "chegada",
          horario_entrada: null,
          horario_chegada: nowIso,
          data_hora: nowIso,
          usuario_id: user?.id ?? null,
        };
      }
      if (reaproveitar) {
        const { error: updErr } = await supabase
          .from("movimentacoes_portaria")
          .update(movPayload as any)
          .eq("id", reaproveitar.id);
        if (updErr) throw updErr;
        // C3 — Apaga OUTRAS chegadas pendentes da mesma placa, sem carga.
        // Antes do DELETE, registramos o motivo da exclusão em `observacoes`
        // para auditoria (caso o operador venha questionar depois).
        const orfaos = (pendentes ?? [])
          .filter((p: any) => p.id !== reaproveitar.id && !p.carga_id)
          .map((p: any) => p.id as string);
        if (orfaos.length > 0) {
          const motivoExclusao = `Excluído automaticamente em ${nowIso}: chegada órfã (sem carga) reaproveitada pela carga ${cargaId} via dedup ${DEDUP_WINDOW_HOURS}h. Reaproveitado: ${reaproveitar.id}.`;
          await supabase
            .from("movimentacoes_portaria")
            .update({ observacoes: motivoExclusao } as any)
            .in("id", orfaos);
          await supabase.from("movimentacoes_portaria").delete().in("id", orfaos);
        }
      } else {
        const { error: movErr } = await supabase
          .from("movimentacoes_portaria")
          .insert(movPayload as any);
        if (movErr) throw movErr;
      }

      // Atualiza placa/motorista nas linhas da carga (caso o veículo real seja diferente do previsto)
      const updateData: Record<string, any> = { placa: placaNorm };
      if (motoristaNorm) updateData.motorista = motoristaNorm;
      await supabase.from("carregamentos_dia").update(updateData).eq("carga_id", cargaId);

      // NÃO marca veiculo_esperado como conferido ainda — só na liberação para o pátio.
      // Apenas garante que está autorizado e vinculado à carga.
      await supabase
        .from("veiculos_esperados" as any)
        .update({
          status_autorizacao: "autorizado",
          autorizado_por: user?.id ?? null,
          autorizado_em: nowIso,
          carga_id: cargaId,
        } as any)
        .eq("carga_id", cargaId);

      // B5 — toast contextual por categoria
      if (isCargaPropria) {
        toast.success("Chegada registrada — veículo no pátio", {
          description: "Carga Própria entra direto no pátio. Próximo passo: registrar saída p/ rota.",
          duration: 6000,
        });
      } else {
        toast.success(
          "Chegada registrada. Quando o caminhão entrar fisicamente no pátio, clique em 'Liberar entrada no pátio' no painel.",
          { duration: 7000 }
        );
      }
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
            {isVinculadoACarga ? "Registrar Chegada" : "Registrar Entrada"} — {grupo === "PRÓPRIA" ? "Frota Própria" : "Terceirizado"}
          </DialogTitle>
          <DialogDescription>
            {isVinculadoACarga
              ? (grupo === "PRÓPRIA"
                  ? "Registra a chegada do motorista da frota própria. O veículo entra direto no pátio."
                  : "Registra a chegada do motorista terceirizado. O veículo entrará no pátio após a liberação no painel.")
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
            {isPending ? "Registrando..." : isVinculadoACarga ? "Registrar chegada" : "Registrar Entrada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
