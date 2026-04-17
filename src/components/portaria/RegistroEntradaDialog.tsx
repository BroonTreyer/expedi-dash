import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MotoristaAutocomplete } from "./MotoristaAutocomplete";
import { CaminhaoAutocomplete } from "./CaminhaoAutocomplete";
import { useRegistrarChegadaWalkIn } from "@/hooks/useVeiculosEsperados";
import { LogIn } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  grupo: "PRÓPRIA" | "TERCEIRIZADO";
}

export function RegistroEntradaDialog({ open, onOpenChange, grupo }: Props) {
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  // Autofill silencioso (enviado ao backend, não exibido como campo)
  const [transportadora, setTransportadora] = useState<string | undefined>(undefined);
  const [tipoVeiculo, setTipoVeiculo] = useState<string | undefined>(undefined);
  // Travas: só permite submit se vieram de seleção
  const [placaSelecionada, setPlacaSelecionada] = useState(false);
  const [motoristaSelecionado, setMotoristaSelecionado] = useState(false);

  const mut = useRegistrarChegadaWalkIn();

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
    // Veículo prioriza autofill
    if (c.tipo_caminhao) setTipoVeiculo(c.tipo_caminhao);
    if (c.transportadora) setTransportadora(c.transportadora);
    if (c.motorista && !motorista) {
      setMotorista(c.motorista);
      setMotoristaSelecionado(true);
    }
  };

  const handleSubmit = async () => {
    if (!placaSelecionada || !motoristaSelecionado) return;
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

  const canSubmit = placaSelecionada && motoristaSelecionado && !mut.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" />
            Registrar Entrada — {grupo === "PRÓPRIA" ? "Frota Própria" : "Terceirizado"}
          </DialogTitle>
          <DialogDescription>
            Vincule motorista e veículo já cadastrados. O veículo ficará disponível para a Logística vincular ao fechar uma carga.
          </DialogDescription>
        </DialogHeader>

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
            {mut.isPending ? "Registrando..." : "Registrar Entrada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
