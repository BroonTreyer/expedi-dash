import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { maskCPF, maskPhone } from "@/lib/masks";
import { useCreateRecebimentoMp } from "@/hooks/useRecebimentosMp";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function RegistrarChegadaDialog({ open, onOpenChange, onCreated }: Props) {
  const create = useCreateRecebimentoMp();
  const [motorista, setMotorista] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [placa, setPlaca] = useState("");
  const [dataChegada, setDataChegada] = useState(todayISO());
  const [horaChegada, setHoraChegada] = useState(nowHHMM());
  const [dataRecebimento, setDataRecebimento] = useState(todayISO());

  function reset() {
    setMotorista(""); setTelefone(""); setCpf(""); setPlaca("");
    setDataChegada(todayISO()); setHoraChegada(nowHHMM()); setDataRecebimento(todayISO());
  }

  async function handleSave() {
    if (!placa.trim() && !motorista.trim()) return;
    const novo = await create.mutateAsync({
      motorista: motorista.trim() || null,
      telefone: telefone || null,
      cpf: cpf || null,
      placa: placa.trim().toUpperCase() || null,
      data_chegada: dataChegada,
      hora_chegada: horaChegada || null,
      data_recebimento: dataRecebimento || null,
      status_geral: "aguardando_descarga",
    } as any);
    reset();
    onOpenChange(false);
    onCreated?.(novo.id);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Chegada — Recebimento MP</DialogTitle>
          <DialogDescription>Dados do motorista e veículo. Os produtos são adicionados depois, na conferência.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Motorista *</Label>
            <Input value={motorista} onChange={(e) => setMotorista(e.target.value)} placeholder="Nome do motorista" />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <Label>CPF</Label>
            <Input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
          </div>
          <div>
            <Label>Placa *</Label>
            <Input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" maxLength={8} />
          </div>
          <div>
            <Label>Data chegada</Label>
            <Input type="date" value={dataChegada} onChange={(e) => setDataChegada(e.target.value)} />
          </div>
          <div>
            <Label>Hora chegada</Label>
            <Input type="time" value={horaChegada} onChange={(e) => setHoraChegada(e.target.value)} />
          </div>
          <div>
            <Label>Data recebimento</Label>
            <Input type="date" value={dataRecebimento} onChange={(e) => setDataRecebimento(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={create.isPending || (!placa.trim() && !motorista.trim())}>
            {create.isPending ? "Salvando..." : "Registrar chegada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
