import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Truck } from "lucide-react";
import type { Carregamento } from "@/hooks/useCarregamentos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Carregamento[];
  tiposCaminhao: { nome_tipo: string }[];
  onSubmit: (updates: { id: string; tipo_caminhao: string; placa: string; motorista: string; ordem_entrega: number; etapa: string; horario_previsto?: string }[]) => void;
}

interface OrderedItem {
  id: string;
  codigoCliente: string | null;
  nomeCliente: string | null;
  nomeProduto: string | null;
  peso: number;
  ordem: number;
}

export function FechamentoLoteDialog({ open, onOpenChange, items, tiposCaminhao, onSubmit }: Props) {
  const [tipoCaminhao, setTipoCaminhao] = useState("");
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const [horarioPrevisto, setHorarioPrevisto] = useState("");
  const [orderedItems, setOrderedItems] = useState<OrderedItem[]>([]);

  // Initialize ordered items when dialog opens
  useEffect(() => {
    if (open && items.length > 0) {
      setOrderedItems(
        items.map((c, idx) => ({
          id: c.id,
          codigoCliente: c.codigo_cliente,
          nomeCliente: c.cliente,
          nomeProduto: c.nome_produto,
          peso: c.peso ?? 0,
          ordem: idx + 1,
        }))
      );
      setTipoCaminhao("");
      setPlaca("");
      setMotorista("");
      setHorarioPrevisto("");
    }
  }, [open, items]);

  const totalPeso = useMemo(() => orderedItems.reduce((s, i) => s + i.peso, 0), [orderedItems]);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setOrderedItems(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((item, i) => ({ ...item, ordem: i + 1 }));
    });
  };

  const moveDown = (idx: number) => {
    if (idx >= orderedItems.length - 1) return;
    setOrderedItems(prev => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((item, i) => ({ ...item, ordem: i + 1 }));
    });
  };

  const setOrdem = (idx: number, value: number) => {
    setOrderedItems(prev => prev.map((item, i) => i === idx ? { ...item, ordem: value } : item));
  };

  const canSubmit = tipoCaminhao && placa && motorista;

  const handleSubmit = () => {
    const updates = orderedItems.map(item => ({
      id: item.id,
      tipo_caminhao: tipoCaminhao,
      placa,
      motorista,
      ordem_entrega: item.ordem,
      etapa: "logistica",
      ...(horarioPrevisto ? { horario_previsto: horarioPrevisto } : {}),
    }));
    onSubmit(updates);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Fechar Carga
          </DialogTitle>
          <DialogDescription>
            Preencha os dados de transporte e defina a ordem de entrega dos {items.length} pedidos selecionados.
          </DialogDescription>
        </DialogHeader>

        {/* Shared logistics fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo Caminhão *</Label>
            <Select value={tipoCaminhao} onValueChange={setTipoCaminhao}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {tiposCaminhao.map((t) => (
                  <SelectItem key={t.nome_tipo} value={t.nome_tipo}>{t.nome_tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Placa *</Label>
            <Input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Motorista *</Label>
            <Input value={motorista} onChange={(e) => setMotorista(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Horário Previsto</Label>
            <Input type="time" value={horarioPrevisto} onChange={(e) => setHorarioPrevisto(e.target.value)} />
          </div>
        </div>

        {/* Order list */}
        <div className="border-t border-border pt-3 mt-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ordem de Entrega</span>
            <span className="text-xs text-muted-foreground">{totalPeso.toLocaleString("pt-BR")} kg total</span>
          </div>
          <div className="space-y-1">
            {orderedItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
              >
                <Input
                  type="number"
                  min={1}
                  value={item.ordem}
                  onChange={(e) => setOrdem(idx, Number(e.target.value))}
                  className="h-8 w-14 text-center text-sm font-bold"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {item.codigoCliente ? `${item.codigoCliente} – ${item.nomeCliente ?? ""}` : "Sem cliente"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.nomeProduto ?? "Sem produto"} · {item.peso.toLocaleString("pt-BR")} kg
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveDown(idx)}
                    disabled={idx === orderedItems.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Fechar Carreta ({orderedItems.length} pedidos)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
