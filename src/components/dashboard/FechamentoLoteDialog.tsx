import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Truck } from "lucide-react";
import type { Carregamento } from "@/hooks/useCarregamentos";

import type { CargaPrintData } from "./CargaPrintDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Carregamento[];
  tiposCaminhao: { nome_tipo: string }[];
  onSubmit: (updates: { id: string; tipo_caminhao: string; placa: string; motorista: string; ordem_entrega: number; etapa: string; carga_id: string; horario_previsto?: string }[]) => void;
  onPrintReady?: (data: CargaPrintData) => void;
  selectedDate?: string;
}

interface ClienteGroup {
  codigoCliente: string | null;
  nomeCliente: string | null;
  items: { id: string; nomeProduto: string | null; peso: number }[];
  pesoTotal: number;
  ordem: number;
}

export function FechamentoLoteDialog({ open, onOpenChange, items, tiposCaminhao, onSubmit, onPrintReady, selectedDate }: Props) {
  const [tipoCaminhao, setTipoCaminhao] = useState("");
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const [horarioPrevisto, setHorarioPrevisto] = useState("");
  const [groups, setGroups] = useState<ClienteGroup[]>([]);

  useEffect(() => {
    if (open && items.length > 0) {
      const map = new Map<string, ClienteGroup>();
      items.forEach((c) => {
        const key = c.codigo_cliente ?? "__sem_cliente__";
        if (!map.has(key)) {
          map.set(key, {
            codigoCliente: c.codigo_cliente,
            nomeCliente: c.cliente,
            items: [],
            pesoTotal: 0,
            ordem: 0,
          });
        }
        const g = map.get(key)!;
        g.items.push({ id: c.id, nomeProduto: c.nome_produto, peso: c.peso ?? 0 });
        g.pesoTotal += c.peso ?? 0;
      });
      const arr = Array.from(map.values()).map((g, idx) => ({ ...g, ordem: idx + 1 }));
      setGroups(arr);
      setTipoCaminhao("");
      setPlaca("");
      setMotorista("");
      setHorarioPrevisto("");
    }
  }, [open, items]);

  const totalPeso = useMemo(() => groups.reduce((s, g) => s + g.pesoTotal, 0), [groups]);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setGroups(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((g, i) => ({ ...g, ordem: i + 1 }));
    });
  };

  const moveDown = (idx: number) => {
    if (idx >= groups.length - 1) return;
    setGroups(prev => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((g, i) => ({ ...g, ordem: i + 1 }));
    });
  };

  const setOrdem = (idx: number, value: number) => {
    setGroups(prev => prev.map((g, i) => i === idx ? { ...g, ordem: value } : g));
  };

  const canSubmit = tipoCaminhao && placa && motorista;

  const handleSubmit = () => {
    // Generate a unique carga_id for this load
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "").substring(0, 4);
    const cargaId = `CG-${dateStr}-${timeStr}`;

    const updates = groups.flatMap(group =>
      group.items.map(item => ({
        id: item.id,
        tipo_caminhao: tipoCaminhao,
        placa,
        motorista,
        ordem_entrega: group.ordem,
        etapa: "logistica",
        carga_id: cargaId,
        ...(horarioPrevisto ? { horario_previsto: horarioPrevisto } : {}),
      }))
    );
    onSubmit(updates);
    onOpenChange(false);

    // Trigger print preview
    if (onPrintReady) {
      onPrintReady({
        cargaId,
        data: selectedDate ?? now.toISOString().split("T")[0],
        tipoCaminhao,
        placa,
        motorista,
        horarioPrevisto: horarioPrevisto || undefined,
        groups: groups.map(g => ({ ...g })),
        totalPeso,
        totalPedidos,
      });
    }
  };

  const totalPedidos = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Fechar Carga
          </DialogTitle>
          <DialogDescription>
            Preencha os dados de transporte e defina a ordem de entrega dos {groups.length} clientes ({totalPedidos} pedidos).
          </DialogDescription>
        </DialogHeader>

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

        <div className="border-t border-border pt-3 mt-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ordem de Entrega por Cliente</span>
            <span className="text-xs text-muted-foreground">{totalPeso.toLocaleString("pt-BR")} kg total</span>
          </div>
          <div className="space-y-1.5">
            {groups.map((group, idx) => (
              <div
                key={group.codigoCliente ?? idx}
                className="rounded-md border border-border bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={group.ordem}
                    onChange={(e) => setOrdem(idx, Number(e.target.value))}
                    className="h-8 w-14 text-center text-sm font-bold"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {group.codigoCliente ? `${group.codigoCliente} – ${group.nomeCliente ?? ""}` : "Sem cliente"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {group.pesoTotal.toLocaleString("pt-BR")} kg · {group.items.length} {group.items.length === 1 ? "pedido" : "pedidos"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveUp(idx)} disabled={idx === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDown(idx)} disabled={idx === groups.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="ml-16 mt-1 space-y-0.5">
                  {group.items.map((item) => (
                    <div key={item.id} className="text-xs text-muted-foreground truncate">
                      {item.nomeProduto ?? "Sem produto"} · {item.peso.toLocaleString("pt-BR")} kg
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Fechar Carga ({totalPedidos} pedidos)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
