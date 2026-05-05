import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateMovimentacao, type MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  movimento: MovimentacaoPortaria | null;
}

export function EditarKmDialog({ open, onOpenChange, movimento }: Props) {
  const updateMov = useUpdateMovimentacao();
  const [kmInicial, setKmInicial] = useState<string>("");
  const [kmFinal, setKmFinal] = useState<string>("");

  useEffect(() => {
    if (open && movimento) {
      setKmInicial(movimento.km_inicial != null ? String(movimento.km_inicial) : "");
      setKmFinal(movimento.km_final != null ? String(movimento.km_final) : "");
    }
  }, [open, movimento]);

  if (!movimento) return null;

  const handleSave = async () => {
    const ki = kmInicial.trim() === "" ? null : Number(kmInicial);
    const kf = kmFinal.trim() === "" ? null : Number(kmFinal);

    if (ki != null && !Number.isFinite(ki)) {
      toast.error("KM Inicial inválido");
      return;
    }
    if (kf != null && !Number.isFinite(kf)) {
      toast.error("KM Final inválido");
      return;
    }
    if (ki != null && kf != null) {
      if (kf < ki) {
        toast.error(`KM Final (${kf}) não pode ser menor que KM Inicial (${ki}).`);
        return;
      }
      if (kf - ki > 3000) {
        toast.error(`Diferença de KM (${kf - ki}) excede o limite de 3.000 km.`);
        return;
      }
    }

    const updates: any = { km_inicial: ki, km_final: kf };
    if (ki != null && kf != null) updates.km_rodado = kf - ki;

    await updateMov.mutateAsync({ id: movimento.id, ...updates });
    toast.success("KM atualizado");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar KM</DialogTitle>
          <DialogDescription>
            {movimento.placa} {movimento.motorista ? `— ${movimento.motorista}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">KM Inicial</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={kmInicial}
              onChange={(e) => setKmInicial(e.target.value)}
              placeholder="Ex: 132667"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">KM Final</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={kmFinal}
              onChange={(e) => setKmFinal(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMov.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateMov.isPending}>
            {updateMov.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}