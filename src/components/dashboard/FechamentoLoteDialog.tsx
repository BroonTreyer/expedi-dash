import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUp, ArrowDown, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Carregamento } from "@/hooks/useCarregamentos";
import type { CargaPrintData } from "./CargaPrintDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Carregamento[];
  tiposCaminhao: { nome_tipo: string }[];
  onSubmit: (updates: { id: string; tipo_caminhao: string; placa: string; motorista: string; transportadora: string; ordem_entrega: number; etapa: string; carga_id: string; data: string; horario_previsto?: string }[]) => void;
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
  const [transportadora, setTransportadora] = useState("");
  const [horarioPrevisto, setHorarioPrevisto] = useState("");
  const [dataCarregamento, setDataCarregamento] = useState("");
  const [groups, setGroups] = useState<ClienteGroup[]>([]);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

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
      setExcludedIds(new Set());
      setTipoCaminhao("");
      setPlaca("");
      setMotorista("");
      setTransportadora("");
      setHorarioPrevisto("");
      setDataCarregamento(selectedDate ?? new Date().toISOString().split("T")[0]);
    }
  }, [open, items, selectedDate]);

  const toggleItem = useCallback((id: string) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((group: ClienteGroup) => {
    const groupIds = group.items.map(i => i.id);
    setExcludedIds(prev => {
      const allExcluded = groupIds.every(id => prev.has(id));
      const next = new Set(prev);
      if (allExcluded) {
        groupIds.forEach(id => next.delete(id));
      } else {
        groupIds.forEach(id => next.add(id));
      }
      return next;
    });
  }, []);

  const activeGroups = useMemo(() => {
    return groups.map(g => ({
      ...g,
      items: g.items.filter(i => !excludedIds.has(i.id)),
      pesoTotal: g.items.filter(i => !excludedIds.has(i.id)).reduce((s, i) => s + i.peso, 0),
    })).filter(g => g.items.length > 0);
  }, [groups, excludedIds]);

  const totalPeso = useMemo(() => activeGroups.reduce((s, g) => s + g.pesoTotal, 0), [activeGroups]);
  const totalPedidos = useMemo(() => activeGroups.reduce((s, g) => s + g.items.length, 0), [activeGroups]);

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

  const canSubmit = tipoCaminhao && placa && motorista && dataCarregamento && totalPedidos > 0;

  const handleSubmit = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "").substring(0, 6);
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    const cargaId = `CG-${dateStr}-${timeStr}-${rand}`;

    const updates = groups.flatMap(group =>
      group.items
        .filter(item => !excludedIds.has(item.id))
        .map(item => ({
          id: item.id,
          tipo_caminhao: tipoCaminhao,
          placa,
          motorista,
          transportadora,
          ordem_entrega: group.ordem,
          etapa: "logistica",
          carga_id: cargaId,
          data: dataCarregamento,
          ...(horarioPrevisto ? { horario_previsto: horarioPrevisto } : {}),
        }))
    );
    onSubmit(updates);
    onOpenChange(false);

    if (onPrintReady) {
      onPrintReady({
        cargaId,
        data: dataCarregamento,
        tipoCaminhao,
        placa,
        motorista,
        transportadora: transportadora || undefined,
        horarioPrevisto: horarioPrevisto || undefined,
        groups: activeGroups.map(g => ({ ...g })),
        totalPeso,
        totalPedidos,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Fechar Carga
          </DialogTitle>
          <DialogDescription>
            Preencha os dados de transporte e selecione os pedidos que entram na carga ({totalPedidos} de {items.length} pedidos selecionados).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Data do Carregamento *</Label>
            <Input type="date" value={dataCarregamento} onChange={(e) => setDataCarregamento(e.target.value)} />
          </div>
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
            <Label className="text-xs">Transportadora</Label>
            <Input value={transportadora} onChange={(e) => setTransportadora(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Horário Previsto</Label>
            <Input type="time" value={horarioPrevisto} onChange={(e) => setHorarioPrevisto(e.target.value)} />
          </div>
        </div>

        <div className="border-t border-border pt-3 mt-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pré-visualização da Carga</span>
            <span className="text-xs text-muted-foreground">{totalPeso.toLocaleString("pt-BR")} kg · {totalPedidos} pedidos</span>
          </div>
          <div className="space-y-1.5">
            {groups.map((group, idx) => {
              const groupIds = group.items.map(i => i.id);
              const allExcluded = groupIds.every(id => excludedIds.has(id));
              const someExcluded = groupIds.some(id => excludedIds.has(id));
              const activeWeight = group.items.filter(i => !excludedIds.has(i.id)).reduce((s, i) => s + i.peso, 0);
              const activeCount = group.items.filter(i => !excludedIds.has(i.id)).length;

              return (
                <div
                  key={group.codigoCliente ?? idx}
                  className={cn("rounded-md border border-border px-3 py-2", allExcluded ? "bg-muted/10 opacity-50" : "bg-muted/30")}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={!allExcluded}
                      onCheckedChange={() => toggleGroup(group)}
                      className={cn(someExcluded && !allExcluded && "data-[state=checked]:bg-primary/60")}
                    />
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
                        {activeWeight.toLocaleString("pt-BR")} kg · {activeCount} {activeCount === 1 ? "pedido" : "pedidos"}
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
                    {group.items.map((item) => {
                      const excluded = excludedIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className={cn("flex items-center gap-2 text-xs text-muted-foreground", excluded && "line-through opacity-40")}
                        >
                          <Checkbox
                            checked={!excluded}
                            onCheckedChange={() => toggleItem(item.id)}
                            className="h-3.5 w-3.5"
                          />
                          <span className="truncate">{item.nomeProduto ?? "Sem produto"} · {item.peso.toLocaleString("pt-BR")} kg</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
