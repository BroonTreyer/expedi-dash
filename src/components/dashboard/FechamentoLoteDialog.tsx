import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Truck, MapPin, Package, GripVertical, Route, Loader2, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Carregamento } from "@/hooks/useCarregamentos";
import type { CargaPrintData } from "./CargaPrintDialog";

const RotaMap = lazy(() => import("./RotaMap").then((m) => ({ default: m.RotaMap })));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Carregamento[];
  tiposCaminhao: { nome_tipo: string }[];
  onSubmit: (updates: { id: string; tipo_caminhao: string; placa: string; motorista: string; transportadora: string; ordem_entrega: number; etapa: string; carga_id: string; data: string; horario_previsto?: string; nome_carga?: string }[]) => void;
  onPrintReady?: (data: CargaPrintData) => void;
  onExcludedChange?: (excludedItemIds: string[]) => void;
  selectedDate?: string;
}

interface ClienteGroup {
  codigoCliente: string | null;
  nomeCliente: string | null;
  cidade: string | null;
  uf: string | null;
  items: { id: string; peso: number; numeroPedido: number | null; nomeProduto: string | null }[];
  pesoTotal: number;
  ordem: number;
}

interface TrechoInfo {
  de: string;
  para: string;
  km: number;
  duracao: number;
}

/* ─── Sortable card ─── */
function SortableDestinationCard({
  group, idx, totalCount, excluded, onToggle, onMoveUp, onMoveDown, onOrderChange,
}: {
  group: ClienteGroup; idx: number; totalCount: number; excluded: boolean;
  onToggle: () => void; onMoveUp: () => void; onMoveDown: () => void; onOrderChange: (n: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.codigoCliente ?? "__sem__",
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [localOrder, setLocalOrder] = useState(String(group.ordem));

  useEffect(() => { setLocalOrder(String(group.ordem)); }, [group.ordem]);

  const handleOrderBlur = () => {
    const num = parseInt(localOrder, 10);
    if (!isNaN(num) && num >= 1 && num <= totalCount && num !== group.ordem) onOrderChange(num);
    else setLocalOrder(String(group.ordem));
  };

  const pedidoNums = group.items.map((i) => i.numeroPedido).filter(Boolean).map((n) => `#${n}`);

  return (
    <div ref={setNodeRef} style={style} className={cn(
      "rounded-md border border-border px-3 py-2.5 transition-opacity",
      excluded ? "bg-muted/10 opacity-40" : "bg-muted/30",
      isDragging && "z-50 shadow-lg ring-2 ring-primary/30 opacity-90"
    )}>
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-0.5 text-muted-foreground hover:text-foreground" tabIndex={-1}>
          <GripVertical className="h-4 w-4" />
        </button>
        <Checkbox checked={!excluded} onCheckedChange={onToggle} />
        <Input
          type="number" min={1} max={totalCount} value={localOrder}
          onChange={(e) => setLocalOrder(e.target.value)}
          onBlur={handleOrderBlur}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-7 w-10 text-center text-xs font-bold p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {group.codigoCliente ? `${group.codigoCliente} – ${group.nomeCliente ?? ""}` : "Sem cliente"}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{group.cidade ?? "Sem cidade"}{group.uf ? ` – ${group.uf}` : ""}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {group.items.length} {group.items.length === 1 ? "pedido" : "pedidos"} · {group.pesoTotal.toLocaleString("pt-BR")} kg
            {pedidoNums.length > 0 && <span className="ml-1.5 text-foreground/60">{pedidoNums.join(", ")}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveUp} disabled={idx === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveDown} disabled={idx === totalCount - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main dialog ─── */
export function FechamentoLoteDialog({ open, onOpenChange, items, tiposCaminhao, onSubmit, onPrintReady, onExcludedChange, selectedDate }: Props) {
  const [tipoCaminhao, setTipoCaminhao] = useState("");
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [horarioPrevisto, setHorarioPrevisto] = useState("");
  const [dataCarregamento, setDataCarregamento] = useState("");
  const [nomeCarga, setNomeCarga] = useState("");
  const [groups, setGroups] = useState<ClienteGroup[]>([]);
  const [excludedGroupKeys, setExcludedGroupKeys] = useState<Set<string>>(new Set());

  // Routing state
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | undefined>();
  const [distanciaTotal, setDistanciaTotal] = useState<number | undefined>();
  const [trechos, setTrechos] = useState<TrechoInfo[] | undefined>();
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    if (open && items.length > 0) {
      const map = new Map<string, ClienteGroup>();
      items.forEach((c) => {
        const key = c.codigo_cliente ?? "__sem_cliente__";
        if (!map.has(key)) {
          map.set(key, { codigoCliente: c.codigo_cliente, nomeCliente: c.cliente, cidade: c.cidade, uf: c.uf, items: [], pesoTotal: 0, ordem: 0 });
        }
        const g = map.get(key)!;
        g.items.push({ id: c.id, peso: c.peso ?? 0, numeroPedido: c.numero_pedido, nomeProduto: c.nome_produto });
        g.pesoTotal += c.peso ?? 0;
      });
      const arr = Array.from(map.values()).map((g, idx) => ({ ...g, ordem: idx + 1 }));
      setGroups(arr);
      setExcludedGroupKeys(new Set());
      setTipoCaminhao("");
      setPlaca("");
      setMotorista("");
      setTransportadora("");
      setHorarioPrevisto("");
      setNomeCarga("");
      setDataCarregamento(selectedDate ?? new Date().toISOString().split("T")[0]);
      setRouteGeometry(undefined);
      setDistanciaTotal(undefined);
      setTrechos(undefined);
    }
  }, [open, items, selectedDate]);

  const groupKey = (g: ClienteGroup) => g.codigoCliente ?? "__sem__";

  const toggleGroup = useCallback((group: ClienteGroup) => {
    const key = groupKey(group);
    setExcludedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen && onExcludedChange) {
      const excludedIds: string[] = [];
      for (const g of groups) {
        if (excludedGroupKeys.has(groupKey(g))) {
          for (const item of g.items) excludedIds.push(item.id);
        }
      }
      if (excludedIds.length > 0) onExcludedChange(excludedIds);
    }
    onOpenChange(nextOpen);
  }, [onOpenChange, onExcludedChange, groups, excludedGroupKeys]);

  const activeGroups = useMemo(() => groups.filter((g) => !excludedGroupKeys.has(groupKey(g))), [groups, excludedGroupKeys]);
  const totalPeso = useMemo(() => activeGroups.reduce((s, g) => s + g.pesoTotal, 0), [activeGroups]);
  const totalPedidos = useMemo(() => activeGroups.reduce((s, g) => s + g.items.length, 0), [activeGroups]);
  const cidadesUnicas = useMemo(() => { const set = new Set<string>(); activeGroups.forEach((g) => { if (g.cidade) set.add(g.cidade); }); return set.size; }, [activeGroups]);
  const ufsUnicas = useMemo(() => { const set = new Set<string>(); activeGroups.forEach((g) => { if (g.uf) set.add(g.uf); }); return Array.from(set).sort(); }, [activeGroups]);

  const renumber = (arr: ClienteGroup[]) => arr.map((g, i) => ({ ...g, ordem: i + 1 }));
  const moveUp = (idx: number) => { if (idx === 0) return; setGroups((prev) => { const next = [...prev]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; return renumber(next); }); };
  const moveDown = (idx: number) => { if (idx >= groups.length - 1) return; setGroups((prev) => { const next = [...prev]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]; return renumber(next); }); };
  const moveToPosition = (fromIdx: number, toPosition: number) => { setGroups((prev) => { const next = [...prev]; const [item] = next.splice(fromIdx, 1); next.splice(toPosition - 1, 0, item); return renumber(next); }); };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const sortableIds = useMemo(() => groups.map((g) => groupKey(g)), [groups]);
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setGroups((prev) => {
      const oldIdx = prev.findIndex((g) => groupKey(g) === active.id);
      const newIdx = prev.findIndex((g) => groupKey(g) === over.id);
      return renumber(arrayMove(prev, oldIdx, newIdx));
    });
  }, []);

  // ── Roteirizar ──
  const handleRoteirizar = useCallback(async () => {
    const destinosParaRoteirizar = activeGroups
      .filter((g) => g.cidade && g.uf)
      .map((g) => ({ cidade: g.cidade!, uf: g.uf!, cliente: g.nomeCliente ?? "Sem cliente" }));

    if (destinosParaRoteirizar.length < 2) {
      toast.info("Necessário ao menos 2 destinos para roteirizar");
      return;
    }

    setIsRouting(true);
    try {
      const { data, error } = await supabase.functions.invoke("roteirizar", {
        body: { destinos: destinosParaRoteirizar },
      });

      if (error) throw error;

      if (data.geometria && data.geometria.length > 0) {
        setRouteGeometry(data.geometria);
      }
      setDistanciaTotal(data.distanciaTotal);
      setTrechos(data.trechos);

      // Reorder groups based on optimized order
      if (data.ordemOtimizada && data.ordemOtimizada.length > 0) {
        setGroups((prev) => {
          const newOrder: ClienteGroup[] = [];
          for (const opt of data.ordemOtimizada) {
            const found = prev.find(
              (g) => g.cidade?.toLowerCase() === opt.cidade?.toLowerCase() && g.uf === opt.uf
            );
            if (found) newOrder.push(found);
          }
          // Add any remaining groups not matched
          for (const g of prev) {
            if (!newOrder.includes(g)) newOrder.push(g);
          }
          return renumber(newOrder);
        });
      }

      toast.success(`Rota otimizada: ${data.distanciaTotal} km`);
    } catch (err: any) {
      toast.error("Erro ao roteirizar: " + (err.message ?? "Tente novamente"));
    } finally {
      setIsRouting(false);
    }
  }, [activeGroups]);

  const canSubmit = tipoCaminhao && placa && motorista && dataCarregamento && totalPedidos > 0;

  const handleSubmit = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "").substring(0, 6);
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    const cargaId = nomeCarga || `CG-${dateStr}-${timeStr}-${rand}`;

    const updates = groups
      .filter((g) => !excludedGroupKeys.has(groupKey(g)))
      .flatMap((group) =>
        group.items.map((item) => ({
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
          ...(nomeCarga ? { nome_carga: nomeCarga } : {}),
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
        groups: activeGroups.map((g) => ({
          codigoCliente: g.codigoCliente,
          nomeCliente: g.nomeCliente,
          items: g.items.map((i) => ({ id: i.id, nomeProduto: i.nomeProduto, peso: i.peso })),
          pesoTotal: g.pesoTotal,
          ordem: g.ordem,
        })),
        totalPeso,
        totalPedidos,
      });
    }
  };

  const rotaDestinos = useMemo(
    () => activeGroups.filter((g) => g.cidade && g.uf).map((g) => ({ ordem: g.ordem, cliente: g.nomeCliente ?? "Sem cliente", cidade: g.cidade!, uf: g.uf! })),
    [activeGroups]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Fechar Carga</DialogTitle>
          <DialogDescription>Preencha os dados de transporte, roteirize e confirme os destinos.</DialogDescription>
        </DialogHeader>

        {/* Transport fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome da Carga</Label>
            <Input value={nomeCarga} onChange={(e) => setNomeCarga(e.target.value)} placeholder="Ex: Carga MG Norte (opcional)" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data do Carregamento *</Label>
            <Input type="date" value={dataCarregamento} onChange={(e) => setDataCarregamento(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo Caminhão *</Label>
            <Select value={tipoCaminhao} onValueChange={setTipoCaminhao}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{tiposCaminhao.map((t) => <SelectItem key={t.nome_tipo} value={t.nome_tipo}>{t.nome_tipo}</SelectItem>)}</SelectContent>
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

        {/* Summary bar + Roteirizar button */}
        <div className="border-t border-border pt-3 mt-1">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{cidadesUnicas} {cidadesUnicas === 1 ? "cidade" : "cidades"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Package className="h-4 w-4 text-primary" />
              <span>{totalPedidos} {totalPedidos === 1 ? "pedido" : "pedidos"}</span>
            </div>
            <span className="text-sm text-muted-foreground">{totalPeso.toLocaleString("pt-BR")} kg</span>
            <div className="flex gap-1 flex-wrap">
              {ufsUnicas.map((uf) => <Badge key={uf} variant="secondary" className="text-xs font-bold">{uf}</Badge>)}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-1.5 text-xs"
              onClick={handleRoteirizar}
              disabled={isRouting || activeGroups.filter((g) => g.cidade && g.uf).length < 2}
            >
              {isRouting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Route className="h-3.5 w-3.5" />}
              Roteirizar
            </Button>
          </div>

          {/* Destination cards with DnD */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {groups.map((group, idx) => (
                  <SortableDestinationCard
                    key={groupKey(group)}
                    group={group}
                    idx={idx}
                    totalCount={groups.length}
                    excluded={excludedGroupKeys.has(groupKey(group))}
                    onToggle={() => toggleGroup(group)}
                    onMoveUp={() => moveUp(idx)}
                    onMoveDown={() => moveDown(idx)}
                    onOrderChange={(newPos) => moveToPosition(idx, newPos)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Route map */}
        <div className="mt-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Rota da Carga</span>
          <Suspense fallback={<div className="h-[320px] rounded-lg border border-border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground animate-pulse">Carregando mapa...</div>}>
            <RotaMap
              destinos={rotaDestinos}
              routeGeometry={routeGeometry}
              distanciaTotal={distanciaTotal}
              trechos={trechos}
              loading={isRouting}
            />
          </Suspense>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Fechar Carga ({totalPedidos} pedidos)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
