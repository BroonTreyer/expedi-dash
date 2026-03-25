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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, MapPin, Package, GripVertical, Route, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Carregamento } from "@/hooks/useCarregamentos";

const RotaMap = lazy(() => import("./RotaMap").then((m) => ({ default: m.RotaMap })));

export interface RoteirizacaoResult {
  groups: RotaGroup[];
  routeGeometry?: [number, number][];
  distanciaTotal?: number;
  trechos?: TrechoInfo[];
}

export interface RotaGroup {
  codigoCliente: string | null;
  nomeCliente: string | null;
  cidade: string | null;
  uf: string | null;
  items: { id: string; peso: number; numeroPedido: number | null }[];
  pesoTotal: number;
  ordem: number;
}

interface TrechoInfo {
  de: string;
  para: string;
  km: number;
  duracao: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Carregamento[];
  onAdvance: (result: RoteirizacaoResult) => void;
  onExcludedChange?: (excludedItemIds: string[]) => void;
}

/* ─── Sortable card ─── */
function SortableDestinationCard({
  group, idx, totalCount, excluded, onToggle, onMoveUp, onMoveDown, onOrderChange, trecho,
}: {
  group: RotaGroup; idx: number; totalCount: number; excluded: boolean;
  onToggle: () => void; onMoveUp: () => void; onMoveDown: () => void; onOrderChange: (n: number) => void;
  trecho?: TrechoInfo;
}) {
  // FIX: use ordem as fallback to avoid DnD ID collisions when multiple groups have no codigoCliente
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.codigoCliente ?? `__sem__${group.ordem}`,
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
          {trecho && (
            <div className="text-xs text-muted-foreground mt-0.5 font-mono">
              {/* BUG 6 FIX: Convert minutes to hours when >= 60 */}
              ↳ {trecho.km.toLocaleString("pt-BR")} km · {trecho.duracao >= 60 ? `~${Math.floor(trecho.duracao / 60)}h${trecho.duracao % 60 > 0 ? ` ${trecho.duracao % 60}min` : ""}` : `~${trecho.duracao} min`} até próximo
            </div>
          )}
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
export function RoteirizacaoDialog({ open, onOpenChange, items, onAdvance, onExcludedChange }: Props) {
  const [groups, setGroups] = useState<RotaGroup[]>([]);
  const [excludedGroupKeys, setExcludedGroupKeys] = useState<Set<string>>(new Set());
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | undefined>();
  const [distanciaTotal, setDistanciaTotal] = useState<number | undefined>();
  const [trechos, setTrechos] = useState<TrechoInfo[] | undefined>();
  const [isRouting, setIsRouting] = useState(false);
  // Coordenadas retornadas pela edge function para pré-popular o geocodeCache do RotaMap
  const [coordsCache, setCoordsCache] = useState<Map<string, { lat: number; lng: number }> | undefined>();

  const [shouldAutoRoute, setShouldAutoRoute] = useState(false);

  useEffect(() => {
    if (open && items.length > 0) {
      const map = new Map<string, RotaGroup>();
      items.forEach((c) => {
        const key = c.codigo_cliente ?? "__sem_cliente__";
        if (!map.has(key)) {
          map.set(key, { codigoCliente: c.codigo_cliente, nomeCliente: c.cliente, cidade: c.cidade, uf: c.uf, items: [], pesoTotal: 0, ordem: 0 });
        }
        const g = map.get(key)!;
        g.items.push({ id: c.id, peso: c.peso ?? 0, numeroPedido: c.numero_pedido });
        g.pesoTotal += c.peso ?? 0;
      });
      const arr = Array.from(map.values()).map((g, idx) => ({ ...g, ordem: idx + 1 }));
      setGroups(arr);
      setExcludedGroupKeys(new Set());
      setRouteGeometry(undefined);
      setDistanciaTotal(undefined);
      setTrechos(undefined);
      setShouldAutoRoute(true);
    }
  }, [open, items]);

  // FIX: groupKey must match useSortable id — use same fallback
  const groupKey = (g: RotaGroup) => g.codigoCliente ?? `__sem__${g.ordem}`;

  const toggleGroup = useCallback((group: RotaGroup) => {
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

  const renumber = (arr: RotaGroup[]) => arr.map((g, i) => ({ ...g, ordem: i + 1 }));

  // Clear stale route geometry whenever the user manually reorders destinations
  const clearRouteGeometry = useCallback(() => {
    setRouteGeometry(undefined);
    setDistanciaTotal(undefined);
    setTrechos(undefined);
  }, []);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    clearRouteGeometry();
    setGroups((prev) => { const next = [...prev]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; return renumber(next); });
  };
  const moveDown = (idx: number) => {
    if (idx >= groups.length - 1) return;
    clearRouteGeometry();
    setGroups((prev) => { const next = [...prev]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]; return renumber(next); });
  };
  const moveToPosition = (fromIdx: number, toPosition: number) => {
    clearRouteGeometry();
    setGroups((prev) => { const next = [...prev]; const [item] = next.splice(fromIdx, 1); next.splice(toPosition - 1, 0, item); return renumber(next); });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  // FIX: use ordem as fallback to avoid DnD sortableIds collisions
  const sortableIds = useMemo(() => groups.map((g) => g.codigoCliente ?? `__sem__${g.ordem}`), [groups]);
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    clearRouteGeometry();
    setGroups((prev) => {
      const oldIdx = prev.findIndex((g) => groupKey(g) === active.id);
      const newIdx = prev.findIndex((g) => groupKey(g) === over.id);
      return renumber(arrayMove(prev, oldIdx, newIdx));
    });
  }, [clearRouteGeometry]);

  const handleRoteirizar = useCallback(async () => {
    // Guard: prevent double calls
    if (isRouting) return;

    const destinosParaRoteirizar = activeGroups
      .filter((g) => g.cidade && g.uf)
      .map((g) => ({ cidade: g.cidade!, uf: g.uf!, cliente: g.nomeCliente ?? "Sem cliente" }));

    // Always clear stale geometry before any routing attempt
    setRouteGeometry(undefined);
    setDistanciaTotal(undefined);
    setTrechos(undefined);

    if (destinosParaRoteirizar.length < 2) {
      toast.info("Necessário ao menos 2 destinos com cidade/UF para roteirizar");
      return;
    }

    setIsRouting(true);
    try {
      const { data, error } = await supabase.functions.invoke("roteirizar", {
        body: { destinos: destinosParaRoteirizar, origemCidade: "Goiânia", origemUf: "GO" },
      });
      if (error) throw error;

      if (data.geometria && data.geometria.length > 0) setRouteGeometry(data.geometria);
      if (data.distanciaTotal != null) setDistanciaTotal(data.distanciaTotal);
      if (data.trechos && data.trechos.length > 0) setTrechos(data.trechos);

      // FIX: Pré-popular geocodeCache do RotaMap com coordenadas já geocodadas pela edge fn.
      // Isso elimina o segundo geocoding via Nominatim no front-end (que falha com rate-limit).
      if (data.ordemOtimizada && data.ordemOtimizada.length > 0) {
        const newCoordsCache = new Map<string, { lat: number; lng: number }>();
        for (const opt of data.ordemOtimizada) {
          if (opt.lat != null && opt.lng != null && opt.cidade && opt.uf) {
            // BUG 1 FIX: Normalize city key to UPPERCASE+no-accents to match RotaMap lookup
            const normCidade = (opt.cidade as string)
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
            const normUf = (opt.uf as string).toUpperCase().trim();
            newCoordsCache.set(`${normCidade},${normUf}`, { lat: opt.lat, lng: opt.lng });
          }
        }
        // Incluir origem também se retornada pela edge function
        if (data.origemLat != null && data.origemLng != null && data.origemCidadeNorm && data.origemUfNorm) {
          newCoordsCache.set(`${data.origemCidadeNorm},${data.origemUfNorm}`, { lat: data.origemLat, lng: data.origemLng });
        }
        if (newCoordsCache.size > 0) setCoordsCache(newCoordsCache);
      }

      if (data.ordemOtimizada && data.ordemOtimizada.length > 0) {
        // Build a lookup: cidade+uf (lowercase) → trecho index from ordemOtimizada
        // ordemOtimizada[i].ordem tells us the 1-based position, index 'i' is 0-based insertion order
        const trechosByKey = new Map<string, TrechoInfo>();
        if (data.trechos && data.trechos.length > 0) {
          // trechos[0] = Goiânia → dest1, trechos[1] = dest1 → dest2, etc.
          // We assign each trecho to the DESTINATION it leads FROM (de → para)
          // So dest at ordem=1 gets trechos[0] (trecho FROM dest1 to dest2), etc.
          data.ordemOtimizada.forEach((opt: { cidade: string; uf: string; ordem: number }, i: number) => {
            const key = `${opt.cidade?.toLowerCase()},${opt.uf?.toLowerCase()}`;
            // trechos index i corresponds to leg FROM this destination to the next
            // (trechos[0] = origin→dest1, trechos[1] = dest1→dest2, ...)
            // Card for dest at position i should show trecho[i] (leg leaving that dest)
            const legIdx = i + 1; // skip origin leg (trechos[0] = origin→dest1)
            if (data.trechos[legIdx]) {
              trechosByKey.set(key, data.trechos[legIdx]);
            }
          });
        }

        setGroups((prev) => {
          // BUG 4 FIX: Map ordemOtimizada back to groups via codigoCliente (stable identity).
          // originalIndex refers to the index in destinosParaRoteirizar (subset when groups excluded),
          // NOT to prev[] directly — so mapping by codigoCliente is more robust.
          // Build lookup: codigoCliente → group (or cidade+uf as fallback for null-code clients)
          const byClienteKey = new Map<string, RotaGroup>();
          prev.forEach((g) => {
            const k = g.codigoCliente ?? `__sem__${g.cidade ?? ""}__${g.uf ?? ""}`;
            byClienteKey.set(k, g);
          });

          const newOrder: RotaGroup[] = [];
          const seen = new Set<RotaGroup>();
          for (const opt of data.ordemOtimizada) {
            const normCidade = (opt.cidade as string)
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
            // Try codigoCliente first, then fall back by cidade+uf match against activeGroups
            const byIdx = activeGroups[opt.originalIndex];
            const found = byIdx
              ?? (byClienteKey.get(normCidade) ?? null); // last-resort fallback
            if (found && !seen.has(found)) {
              newOrder.push(found);
              seen.add(found);
            }
          }
          // Append any groups not matched (e.g. failed geocoding)
          for (const g of prev) { if (!seen.has(g)) newOrder.push(g); }
          return renumber(newOrder);
        });
      }
      // BUG 11 FIX: Format distance with locale separator
      toast.success(`Rota otimizada: ${Number(data.distanciaTotal).toLocaleString("pt-BR")} km`);
    } catch (err: any) {
      toast.error("Erro ao roteirizar: " + (err.message ?? "Tente novamente"));
    } finally {
      setIsRouting(false);
    }
  }, [activeGroups, isRouting]);

  // Auto-route on open — only fires once per dialog open
  useEffect(() => {
    if (shouldAutoRoute && !isRouting && groups.length >= 2) {
      setShouldAutoRoute(false);
      handleRoteirizar();
    }
  }, [shouldAutoRoute, isRouting, groups.length, handleRoteirizar]);

  const handleAdvance = () => {
    onAdvance({
      groups: activeGroups,
      routeGeometry,
      distanciaTotal,
      trechos,
    });
    onOpenChange(false);
  };

  const rotaDestinos = useMemo(
    () => activeGroups
      .filter((g) => g.cidade && g.uf)
      .map((g) => ({ ordem: g.ordem, cliente: g.nomeCliente ?? "Sem cliente", cidade: g.cidade!, uf: g.uf! })),
    [activeGroups]
  );

  // FIX: estabilizar objeto origem — evitar nova referência a cada render do pai
  // que causa citySetKey diferente e destrói o MapContainer durante o geocoding
  const origemEstavel = useMemo(() => ({ cidade: "Goiânia", uf: "GO" }), []);

  // Build trecho lookup by codigoCliente for the cards
  // trechos[0] = Goiânia→dest1, trechos[1] = dest1→dest2, ...
  // For a card at position idx in activeGroups, the "outgoing" leg is trechos[idx+1]
  // (trechos[0] is the origin leg, idx=0 should show the leg FROM dest1 to dest2 = trechos[1])
  const activeTrechoMap = useMemo(() => {
    const map = new Map<string, TrechoInfo>();
    if (!trechos) return map;
    activeGroups
      .filter((g) => g.cidade && g.uf)
      .forEach((g, i) => {
        // i=0 → trechos[1] (leg FROM dest1), i=1 → trechos[2], last has no outgoing
        const legIdx = i + 1;
        if (trechos[legIdx]) {
          map.set(groupKey(g), trechos[legIdx]);
        }
      });
    return map;
  }, [trechos, activeGroups]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Route className="h-5 w-5" /> Roteirização</DialogTitle>
          <DialogDescription>Visualize e otimize a rota de entrega antes de fechar a carga.</DialogDescription>
        </DialogHeader>

        {/* Summary bar */}
        <div className="flex flex-wrap items-center gap-3">
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
            variant="default"
            size="sm"
            className="ml-auto gap-1.5 text-xs"
            onClick={handleRoteirizar}
            disabled={isRouting || activeGroups.filter((g) => g.cidade && g.uf).length < 2}
          >
            {isRouting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Route className="h-3.5 w-3.5" />}
            Roteirizar
          </Button>
        </div>

        {/* Map */}
        {/* BUG 18 FIX: Suspense fallback height matches RotaMap's h-[320px] (was h-[350px]) */}
        <div>
          <Suspense fallback={<div className="h-[320px] rounded-lg border border-border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground animate-pulse">Carregando mapa...</div>}>
          <RotaMap
              destinos={rotaDestinos}
              origem={origemEstavel}
              routeGeometry={routeGeometry}
              distanciaTotal={distanciaTotal}
              trechos={trechos}
              loading={isRouting}
              coordsCache={coordsCache}
            />
          </Suspense>
        </div>

        {/* Destination cards with DnD */}
        <div className="border-t border-border pt-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Destinos ({groups.length})</span>
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
                    trecho={activeTrechoMap.get(groupKey(group))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAdvance} disabled={totalPedidos === 0} className="gap-1.5">
            <ArrowRight className="h-4 w-4" />
            Avançar para Fechar Carga
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
