import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlacaInput } from "./PlacaInput";
import { MotoristaAutocomplete } from "./MotoristaAutocomplete";
import { useTiposCaminhao } from "@/hooks/useTiposCaminhao";
import { useRegistrarChegadaWalkIn } from "@/hooks/useVeiculosEsperados";
import { AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  grupo: "PRÓPRIA" | "TERCEIRIZADO";
}

export function RegistroChegadaWalkInDialog({ open, onOpenChange, grupo }: Props) {
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [tipoVeiculo, setTipoVeiculo] = useState<string>("");
  const [destino, setDestino] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const { data: tipos = [] } = useTiposCaminhao();
  const mut = useRegistrarChegadaWalkIn();

  const reset = () => {
    setPlaca(""); setMotorista(""); setTransportadora(""); setTipoVeiculo(""); setDestino(""); setObservacoes("");
  };

  const handleSubmit = async () => {
    if (!placa.trim() || !motorista.trim()) return;
    await mut.mutateAsync({
      placa: placa.trim(),
      motorista: motorista.trim(),
      transportadora: transportadora.trim() || undefined,
      tipo_veiculo: tipoVeiculo || undefined,
      destino: destino.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      grupo: grupo === "PRÓPRIA" ? "WALK-IN-PROPRIA" : "WALK-IN-TERCEIRIZADO",
    });
    reset();
    onOpenChange(false);
  };

  const handleAutofill = (data: { motorista?: string; tipo_caminhao?: string; transportadora?: string }) => {
    if (data.motorista && !motorista) setMotorista(data.motorista);
    if (data.tipo_caminhao && !tipoVeiculo) setTipoVeiculo(data.tipo_caminhao);
    if (data.transportadora && !transportadora) setTransportadora(data.transportadora);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Chegada sem previsão
          </DialogTitle>
          <DialogDescription>
            Registre o veículo que chegou sem estar na lista. A Logística será notificada para autorizar a entrada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <PlacaInput value={placa} onChange={setPlaca} onAutofill={handleAutofill} />

          <div className="space-y-1.5">
            <Label>Motorista *</Label>
            <MotoristaAutocomplete
              value={motorista}
              onChange={setMotorista}
              onSelect={(m) => {
                setMotorista(m.nome_completo);
                if (m.transportadora && !transportadora) setTransportadora(m.transportadora);
                if (m.tipo_caminhao && !tipoVeiculo) setTipoVeiculo(m.tipo_caminhao);
              }}
            />
          </div>

          {grupo === "TERCEIRIZADO" && (
            <div className="space-y-1.5">
              <Label>Transportadora</Label>
              <Input value={transportadora} onChange={(e) => setTransportadora(e.target.value)} placeholder="Nome da transportadora" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Tipo de veículo</Label>
            <Select value={tipoVeiculo} onValueChange={setTipoVeiculo}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={t.nome_tipo}>{t.nome_tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Destino / Rota</Label>
            <Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex.: Centro, Setor Bueno..." />
          </div>

          <div className="space-y-1.5">
            <Label>Motivo / Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex.: veio buscar carga avulsa, retorno antecipado..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={mut.isPending || !placa.trim() || !motorista.trim()}
          >
            {mut.isPending ? "Enviando..." : "Solicitar autorização"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
