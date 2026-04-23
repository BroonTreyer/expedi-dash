import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MotoristaAutocomplete } from "./MotoristaAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface VeiculoLite {
  id: string;
  placa: string;
  motorista?: string | null;
  transportadora?: string | null;
  tipo_veiculo?: string | null;
  observacoes?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  veiculo: VeiculoLite | null;
}

export function EditarVeiculoEsperadoDialog({ open, onOpenChange, veiculo }: Props) {
  const qc = useQueryClient();
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [tipoVeiculo, setTipoVeiculo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (veiculo) {
      setPlaca(veiculo.placa || "");
      setMotorista(veiculo.motorista || "");
      setTransportadora(veiculo.transportadora || "");
      setTipoVeiculo(veiculo.tipo_veiculo || "");
      setObservacoes(veiculo.observacoes || "");
    }
  }, [veiculo]);

  const handleSave = async () => {
    if (!veiculo) return;
    const placaNorm = placa.trim().toUpperCase();
    if (!placaNorm) {
      toast.error("Placa é obrigatória");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("veiculos_esperados")
        .update({
          placa: placaNorm,
          motorista: motorista.trim() || null,
          transportadora: transportadora.trim() || null,
          tipo_veiculo: tipoVeiculo.trim() || null,
          observacoes: observacoes.trim() || null,
        })
        .eq("id", veiculo.id);
      if (error) throw error;
      toast.success("Dados atualizados");
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_ativos"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados_pendentes"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar dados do veículo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Placa *</Label>
            <Input
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="ABC1D23"
              className="font-mono uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Motorista</Label>
            <MotoristaAutocomplete
              value={motorista}
              onChange={setMotorista}
              onSelect={(m) => {
                if (m.transportadora && !transportadora.trim()) setTransportadora(m.transportadora);
                if (m.tipo_caminhao && !tipoVeiculo.trim()) setTipoVeiculo(m.tipo_caminhao);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Transportadora</Label>
            <Input
              value={transportadora}
              onChange={(e) => setTransportadora(e.target.value)}
              placeholder="Nome da transportadora"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de veículo</Label>
            <Input
              value={tipoVeiculo}
              onChange={(e) => setTipoVeiculo(e.target.value)}
              placeholder="Ex.: Truck, Toco, Carreta..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}