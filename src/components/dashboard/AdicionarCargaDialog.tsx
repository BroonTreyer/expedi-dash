import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";
import type { Carregamento } from "@/hooks/useCarregamentos";

export interface CargaResumo {
  cargaId: string;
  placa: string | null;
  motorista: string | null;
  tipoCaminhao: string | null;
  horarioPrevisto: string | null;
  pesoTotal: number;
  qtdPedidos: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cargas: CargaResumo[];
  items: Carregamento[];
  onSubmit: (updates: { id: string; carga_id: string; placa: string | null; motorista: string | null; tipo_caminhao: string | null; horario_previsto: string | null; etapa: string; ordem_entrega: number }[]) => void;
}

export function AdicionarCargaDialog({ open, onOpenChange, cargas, items, onSubmit }: Props) {
  const [selectedCarga, setSelectedCarga] = useState<string | null>(null);
  const [ordemInicial, setOrdemInicial] = useState(1);

  const carga = useMemo(() => cargas.find(c => c.cargaId === selectedCarga), [cargas, selectedCarga]);

  const handleConfirm = () => {
    if (!carga || items.length === 0) return;
    const updates = items.map((item, i) => ({
      id: item.id,
      carga_id: carga.cargaId,
      placa: carga.placa,
      motorista: carga.motorista,
      tipo_caminhao: carga.tipoCaminhao,
      horario_previsto: carga.horarioPrevisto,
      etapa: "logistica",
      ordem_entrega: ordemInicial + i,
    }));
    onSubmit(updates);
    onOpenChange(false);
    setSelectedCarga(null);
    setOrdemInicial(1);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setSelectedCarga(null);
      setOrdemInicial(1);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar à Carga Existente</DialogTitle>
          <DialogDescription>
            Selecione uma carga fechada para vincular {items.length} pedido{items.length > 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        {cargas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma carga fechada encontrada para este dia.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {cargas.map((c) => (
              <button
                key={c.cargaId}
                type="button"
                onClick={() => setSelectedCarga(c.cargaId)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedCarga === c.cargaId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{c.cargaId}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {c.qtdPedidos} pedido{c.qtdPedidos > 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3">
                  {c.placa && <span>Placa: {c.placa}</span>}
                  {c.motorista && <span>Motorista: {c.motorista}</span>}
                  {c.tipoCaminhao && <span>Tipo: {c.tipoCaminhao}</span>}
                  <span>Peso: {c.pesoTotal.toLocaleString("pt-BR")} kg</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedCarga && (
          <div className="flex items-center gap-3">
            <Label htmlFor="ordem-inicial" className="whitespace-nowrap text-sm">Ordem de entrega inicial</Label>
            <Input
              id="ordem-inicial"
              type="number"
              min={1}
              value={ordemInicial}
              onChange={(e) => setOrdemInicial(Number(e.target.value) || 1)}
              className="w-20"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedCarga}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
