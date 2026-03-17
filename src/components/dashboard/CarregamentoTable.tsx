import { useState, useMemo, Fragment, useRef, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { useSortableTable } from "@/hooks/useSortableTable";
import { StatusSelect } from "./StatusSelect";
import { EtapaBadge } from "./EtapaBadge";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Edit, ClipboardCheck, AlertTriangle, ChevronRight, ChevronDown, Undo2, Printer, PackageSearch, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Carregamento } from "@/hooks/useCarregamentos";
import type { AppRole } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Props {
  data: Carregamento[];
  currentDate?: string;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (c: Carregamento) => void;
  onDelete: (id: string) => void;
  onComplete: (c: Carregamento) => void;
  onUndoCarga?: (cargaId: string) => void;
  onPrintCarga?: (cargaId: string) => void;
  userRole?: AppRole | null;
  statuses?: readonly string[];
  statusColors?: Record<string, string>;
  showPesoAprox?: boolean;
  hideColumns?: string[];
  canChangeStatus?: boolean;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

function PreviousDayBadge({ itemDate, currentDate }: { itemDate: string; currentDate?: string }) {
  if (!currentDate || itemDate === currentDate) return null;
  const diff = Math.round((new Date(currentDate).getTime() - new Date(itemDate).getTime()) / 86400000);
  if (diff <= 0) return null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
            <CalendarClock className="h-3 w-3" />
            D-{diff}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <span>Pedido de {new Date(itemDate + "T12:00:00").toLocaleDateString("pt-BR")}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface Group {
  codigoCliente: string | null;
  nomeCliente: string | null;
  items: Carregamento[];
}

function formatTime(val: string | null) {
  if (!val) return "—";
  try {
    if (val.includes("T") || val.includes(" ")) {
      return new Date(val).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    return val.substring(0, 5);
  } catch {
    return val;
  }
}

function PendingCell({ value }: { value: string | null }) {
  if (value) return <span className="text-sm">{value}</span>;
  return <span className="text-xs text-muted-foreground/60 italic">Pendente</span>;
}

function formatPesoAprox(peso: number | null, tipoCaminhao: string | null) {
  const ton = ((peso ?? 0) / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return tipoCaminhao ? `${ton} TON - ${tipoCaminhao}` : `${ton} TON`;
}

function buildGroups(data: Carregamento[]): Group[] {
  const map = new Map<string, Group>();
  const singles: Group[] = [];
  for (const c of data) {
    if (c.codigo_cliente) {
      const key = c.codigo_cliente;
      if (map.has(key)) {
        map.get(key)!.items.push(c);
      } else {
        map.set(key, { codigoCliente: c.codigo_cliente, nomeCliente: c.cliente, items: [c] });
      }
    } else {
      singles.push({ codigoCliente: null, nomeCliente: null, items: [c] });
    }
  }
  return [...map.values(), ...singles];
}

// ─── Mobile ───

function MobileCardView({ data, onStatusChange, onEdit, onDelete, onComplete, userRole, statuses, statusColors, showPesoAprox, hideColumns = [], canChangeStatus: canChangeStatusProp }: Props) {
  const isAdmin = userRole === "admin";
  const isLogistica = userRole === "logistica";
  const isFaturamento = userRole === "faturamento";
  const canChangeStatus = canChangeStatusProp ?? (isAdmin || isLogistica || isFaturamento);
  const canEdit = isAdmin || isFaturamento;
  const canDelete = isAdmin || isFaturamento;
  const canComplete = isAdmin || isLogistica;
  const hasActions = isAdmin || isLogistica || isFaturamento;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo(() => buildGroups(data), [data]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <PackageSearch className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm">Nenhum carregamento encontrado</p>
        <p className="text-xs text-muted-foreground/60">Tente ajustar os filtros ou selecionar outra data</p>
      </div>
    );
  }

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isMulti = group.codigoCliente !== null && group.items.length > 1;
        if (isMulti) {
          const first = group.items[0];
          const isOpen = expanded.has(group.codigoCliente!);
          const totalPeso = group.items.reduce((s, i) => s + (i.peso ?? 0), 0);
          return (
            <div key={`g-${group.codigoCliente}`} className="rounded-lg border-2 border-primary/20 overflow-hidden">
              <button
                type="button"
                className="w-full bg-primary/5 px-3 py-2 flex items-center justify-between gap-2 hover:bg-primary/10 transition-colors"
                onClick={() => toggle(group.codigoCliente!)}
              >
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
                  <span className="text-xs font-mono font-bold text-primary">{group.codigoCliente} – {group.nomeCliente ?? "Sem nome"}</span>
                  {!hideColumns.includes("etapa") && <EtapaBadge etapa={first.etapa} />}
                  <StatusBadge status={first.status} statusColors={statusColors} />
                </div>
                <span className="text-xs text-muted-foreground">{group.items.length} itens · {totalPeso.toLocaleString("pt-BR")} kg</span>
              </button>
              {isOpen && (
                <div className="divide-y divide-border/40">
                  {group.items.map((c, idx) => (
                    <MobileCardItem key={c.id} c={c} isAdmin={isAdmin} canEdit={canEdit} canDelete={canDelete} canComplete={canComplete} hasActions={hasActions} canChangeStatus={canChangeStatus} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} statuses={statuses} statusColors={statusColors} showPesoAprox={showPesoAprox} hideColumns={hideColumns} isGrouped={idx > 0} />
                  ))}
                </div>
              )}
            </div>
          );
        }
        const c = group.items[0];
        return <MobileCardItem key={c.id} c={c} isAdmin={isAdmin} canEdit={canEdit} canDelete={canDelete} canComplete={canComplete} hasActions={hasActions} canChangeStatus={canChangeStatus} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} statuses={statuses} statusColors={statusColors} showPesoAprox={showPesoAprox} hideColumns={hideColumns} isGrouped={false} />;
      })}
    </div>
  );
}

function MobileCardItem({ c, isAdmin, canEdit, canDelete, canComplete, hasActions, canChangeStatus, onStatusChange, onEdit, onDelete, onComplete, statuses, statusColors, showPesoAprox, hideColumns = [], isGrouped }: {
  c: Carregamento; isAdmin: boolean; canEdit: boolean; canDelete: boolean; canComplete: boolean; hasActions: boolean; canChangeStatus: boolean;
  onStatusChange: (id: string, s: string) => void; onEdit: (c: Carregamento) => void; onDelete: (id: string) => void; onComplete: (c: Carregamento) => void;
  statuses?: readonly string[]; statusColors?: Record<string, string>; showPesoAprox?: boolean; hideColumns?: string[]; isGrouped: boolean;
}) {
  return (
    <CardContent className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {!isGrouped && !hideColumns.includes("etapa") && <EtapaBadge etapa={c.etapa} />}
          {!isGrouped && <StatusBadge status={c.status} statusColors={statusColors} />}
          {c.ruptura && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase">
              <AlertTriangle className="h-3 w-3" /> Ruptura
            </span>
          )}
        </div>
        {hasActions && (
          <div className="flex gap-1 shrink-0">
            {canComplete && c.etapa === "vendas" && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Completar logística" onClick={() => onComplete(c)}>
                <ClipboardCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            {canEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <span className="font-medium text-sm">{c.nome_produto || c.codigo_produto || "Sem produto"}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {!isGrouped && (
          <>
            <div className="text-muted-foreground">Vendedor</div>
            <div>{c.vendedores?.nome_vendedor ?? "—"}</div>
          </>
        )}
        {!hideColumns.includes("peso") && (
          <>
            <div className="text-muted-foreground">Peso</div>
            <div className="font-medium">{(c.peso ?? 0).toLocaleString("pt-BR")} kg</div>
          </>
        )}
        {showPesoAprox && (
          <>
            <div className="text-muted-foreground">Peso Aprox.</div>
            <div className="font-medium">{formatPesoAprox(c.peso, c.tipo_caminhao)}</div>
          </>
        )}
        {!isGrouped && (
          <>
            <div className="text-muted-foreground">Caminhão</div>
            <div>{c.tipo_caminhao || <span className="text-muted-foreground/60 italic">Pendente</span>}</div>
            <div className="text-muted-foreground">Motorista</div>
            <div>{c.motorista || <span className="text-muted-foreground/60 italic">Pendente</span>}</div>
            <div className="text-muted-foreground">Cliente</div>
            <div>{c.codigo_cliente ? `${c.codigo_cliente} – ${c.cliente ?? ""}` : (c.cliente ?? "—")}</div>
            <div className="text-muted-foreground">Cidade</div>
            <div>{c.cidade ?? "—"}</div>
            <div className="text-muted-foreground">UF</div>
            <div>{c.uf ?? "—"}</div>
          </>
        )}
      </div>

      {!isGrouped && canChangeStatus && (
        <div className="pt-1 border-t border-border">
          <StatusSelect value={c.status} onChange={(s) => onStatusChange(c.id, s)} statuses={statuses} statusColors={statusColors} />
        </div>
      )}
    </CardContent>
  );
}

// ─── Desktop ───

export function CarregamentoTable({ data, currentDate, onStatusChange, onEdit, onDelete, onComplete, onUndoCarga, onPrintCarga, userRole, statuses, statusColors, showPesoAprox, hideColumns = [], canChangeStatus: canChangeStatusProp, selectable, selectedIds = [], onSelectionChange }: Props) {
  const isMobile = useIsMobile();
  const isAdmin = userRole === "admin";
  const isLogistica = userRole === "logistica";
  const isFaturamento = userRole === "faturamento";
  const canChangeStatus = canChangeStatusProp ?? (isAdmin || isLogistica || isFaturamento);
  const canEdit = isAdmin || isFaturamento;
  const canDelete = isAdmin || isFaturamento;
  const canComplete = isAdmin || isLogistica;
  const hasActions = isAdmin || isLogistica || isFaturamento;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const bottomProxyRef = useRef<HTMLDivElement>(null);
  const [proxyWidth, setProxyWidth] = useState(0);
  const [showProxy, setShowProxy] = useState(false);
  const isSyncing = useRef(false);

  const { sort, toggleSort, sortData } = useSortableTable();

  const sortAccessors: Record<string, (c: Carregamento) => any> = useMemo(() => ({
    etapa: (c) => c.etapa,
    status: (c) => c.status,
    vendedor: (c) => c.vendedores?.nome_vendedor ?? "",
    codigo_produto: (c) => c.codigo_produto ?? "",
    nome_produto: (c) => c.nome_produto ?? "",
    peso: (c) => c.peso ?? 0,
    tipo_caminhao: (c) => c.tipo_caminhao ?? "",
    motorista: (c) => c.motorista ?? "",
    cliente: (c) => c.cliente ?? "",
    cidade: (c) => c.cidade ?? "",
    uf: (c) => c.uf ?? "",
    tipo_frete: (c) => c.tipo_frete ?? "",
  }), []);

  const sortedData = useMemo(() => sortData(data, sortAccessors), [data, sortData, sortAccessors]);
  const groups = useMemo(() => buildGroups(sortedData), [sortedData]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allIds = useMemo(() => data.map(c => c.id), [data]);
  const allSelected = selectable && allIds.length > 0 && allIds.every(id => selectedSet.has(id));

  const toggleSelect = useCallback((id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedSet);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectionChange(Array.from(next));
  }, [selectedSet, onSelectionChange]);

  const toggleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allIds);
    }
  }, [allSelected, allIds, onSelectionChange]);

  // Measure overflow and sync proxy width
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const measure = () => {
      const sw = el.scrollWidth;
      const cw = el.clientWidth;
      setShowProxy(sw > cw + 1);
      setProxyWidth(sw);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data, expanded]);

  const syncScroll = useCallback((source: HTMLDivElement | null) => {
    if (isSyncing.current || !source) return;
    isSyncing.current = true;
    const sl = source.scrollLeft;
    [tableScrollRef, bottomProxyRef].forEach(ref => {
      if (ref.current && ref.current !== source) ref.current.scrollLeft = sl;
    });
    requestAnimationFrame(() => { isSyncing.current = false; });
  }, []);

  const handleTableScroll = useCallback(() => syncScroll(tableScrollRef.current), [syncScroll]);
  const handleBottomProxyScroll = useCallback(() => syncScroll(bottomProxyRef.current), [syncScroll]);

  if (isMobile) {
    return <MobileCardView data={data} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} userRole={userRole} statuses={statuses} statusColors={statusColors} showPesoAprox={showPesoAprox} hideColumns={hideColumns} canChangeStatus={canChangeStatus} />;
  }

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const colCount = 11
    + (selectable ? 1 : 0)
    + (hideColumns.includes("etapa") ? 0 : 1)
    + (hideColumns.includes("peso") ? 0 : 1)
    + (showPesoAprox ? 1 : 0)
    + (hasActions ? 1 : 0);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div
        ref={tableScrollRef}
        onScroll={handleTableScroll}
        className="overflow-x-auto overflow-y-clip [scrollbar-width:none] [&::-webkit-scrollbar]:!hidden [-ms-overflow-style:none]"
        style={{ scrollbarWidth: 'none' }}
      >
        <Table>
          <TableHeader className="sticky top-0 z-30 bg-background shadow-[0_1px_3px_0_hsl(var(--border)/0.6)]">
            <TableRow className="[&>th]:bg-background">
              {selectable && (
                <TableHead className="w-[40px]">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                </TableHead>
              )}
              <TableHead className="w-[32px]"></TableHead>
              {!hideColumns.includes("etapa") && <TableHead className="w-[120px]">Etapa</TableHead>}
              <TableHead className="w-[160px]">Status</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Cód. Produto</TableHead>
              <TableHead>Produto</TableHead>
              {!hideColumns.includes("peso") && <TableHead className="text-right">Peso (kg)</TableHead>}
              <TableHead>Caminhão</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>UF</TableHead>
              {showPesoAprox && <TableHead>Peso Aprox.</TableHead>}
              <TableHead>Frete</TableHead>
              {hasActions && <TableHead className="w-[110px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={colCount + 1} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <PackageSearch className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm">Nenhum carregamento encontrado</p>
                    <p className="text-xs text-muted-foreground/60">Tente ajustar os filtros ou selecionar outra data</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {groups.map((group) => {
              const isMulti = group.codigoCliente !== null && group.items.length > 1;

              if (!isMulti) {
                const c = group.items[0];
                return (
                  <TableRow key={c.id} className={cn("hover:bg-muted/30", c.ruptura && "bg-amber-50/40 dark:bg-amber-950/20")}>
                    {selectable && (
                      <TableCell className="w-[40px]">
                        <Checkbox checked={selectedSet.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                      </TableCell>
                    )}
                    <TableCell />
                    {!hideColumns.includes("etapa") && (
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <EtapaBadge etapa={c.etapa} />
                          <PreviousDayBadge itemDate={c.data} currentDate={currentDate} />
                          {c.ruptura && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {canChangeStatus ? (
                        <StatusSelect value={c.status} onChange={(s) => onStatusChange(c.id, s)} statuses={statuses} statusColors={statusColors} />
                      ) : (
                        <StatusBadge status={c.status} statusColors={statusColors} />
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{c.vendedores?.nome_vendedor ?? "—"}</TableCell>
                    <TableCell className="text-sm font-mono">
                      <span className="flex items-center gap-1.5">
                        {c.codigo_produto ?? "—"}
                        {c.ruptura && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                            <AlertTriangle className="h-3 w-3" /> Ruptura
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{c.nome_produto ?? "—"}</TableCell>
                    {!hideColumns.includes("peso") && <TableCell className="text-sm text-right font-medium">{(c.peso ?? 0).toLocaleString("pt-BR")}</TableCell>}
                    <TableCell><PendingCell value={c.tipo_caminhao} /></TableCell>
                    <TableCell><PendingCell value={c.motorista} /></TableCell>
                    <TableCell className="text-sm">
                      <span className="flex items-center gap-1.5">
                        {c.codigo_cliente ? `${c.codigo_cliente} – ${c.cliente ?? ""}` : (c.cliente ?? "—")}
                        {c.ordem_entrega != null && (
                          <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold h-5 min-w-5 px-1">
                            {c.ordem_entrega}ª
                          </span>
                        )}
                        {c.carga_id && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">
                            {c.carga_id}
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{c.cidade ?? "—"}</TableCell>
                    <TableCell className="text-sm">{c.uf ?? "—"}</TableCell>
                    {showPesoAprox && <TableCell className="text-sm font-medium whitespace-nowrap">{formatPesoAprox(c.peso, c.tipo_caminhao)}</TableCell>}
                    <TableCell className="text-sm">{c.tipo_frete ?? "—"}</TableCell>
                    {hasActions && (
                      <TableCell>
                        <div className="flex gap-1">
                          {(isAdmin || isLogistica) && c.carga_id && onPrintCarga && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Imprimir Romaneio" onClick={() => onPrintCarga(c.carga_id!)}>
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(isAdmin || isLogistica) && c.carga_id && onUndoCarga && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Desfazer Carga" onClick={() => onUndoCarga(c.carga_id!)}>
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canComplete && c.etapa === "vendas" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Completar logística" onClick={() => onComplete(c)}>
                              <ClipboardCheck className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              }

              // Multi-item group
              const first = group.items[0];
              const isOpen = expanded.has(group.codigoCliente!);
              const totalPeso = group.items.reduce((s, i) => s + (i.peso ?? 0), 0);
              const hasRuptura = group.items.some(i => i.ruptura);
              const groupAllSelected = selectable && group.items.every(i => selectedSet.has(i.id));

              return (
                <Fragment key={`group-${group.codigoCliente}`}>
                  <TableRow
                    className={cn(
                      "hover:bg-muted/30 cursor-pointer border-t-2 border-t-primary/30 bg-primary/[0.03]",
                      hasRuptura && "bg-amber-50/40 dark:bg-amber-950/20",
                      !isOpen && "border-b"
                    )}
                    onClick={() => toggle(group.codigoCliente!)}
                  >
                    {selectable && (
                      <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={groupAllSelected}
                          onCheckedChange={() => {
                            if (!onSelectionChange) return;
                            const next = new Set(selectedSet);
                            if (groupAllSelected) {
                              group.items.forEach(i => next.delete(i.id));
                            } else {
                              group.items.forEach(i => next.add(i.id));
                            }
                            onSelectionChange(Array.from(next));
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell className="px-2">
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-primary" />
                        : <ChevronRight className="h-4 w-4 text-primary" />
                      }
                    </TableCell>
                    {!hideColumns.includes("etapa") && (
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <EtapaBadge etapa={first.etapa} />
                          {hasRuptura && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {canChangeStatus ? (
                        <StatusSelect value={first.status} onChange={(s) => group.items.forEach(i => onStatusChange(i.id, s))} statuses={statuses} statusColors={statusColors} />
                      ) : (
                        <StatusBadge status={first.status} statusColors={statusColors} />
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{first.vendedores?.nome_vendedor ?? "—"}</TableCell>
                    <TableCell colSpan={2} className="text-sm text-muted-foreground italic">
                      {group.items.length} produtos
                    </TableCell>
                    {!hideColumns.includes("peso") && <TableCell className="text-sm text-right font-semibold">{totalPeso.toLocaleString("pt-BR")}</TableCell>}
                    <TableCell><PendingCell value={first.tipo_caminhao} /></TableCell>
                    <TableCell><PendingCell value={first.motorista} /></TableCell>
                    <TableCell className="text-sm font-mono font-bold text-primary">
                      <span className="flex items-center gap-1.5">
                        {group.codigoCliente} – {group.nomeCliente ?? ""}
                        {first.ordem_entrega != null && (
                          <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold h-5 min-w-5 px-1">
                            {first.ordem_entrega}ª
                          </span>
                        )}
                        {first.carga_id && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">
                            {first.carga_id}
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{first.cidade ?? "—"}</TableCell>
                    <TableCell className="text-sm">{first.uf ?? "—"}</TableCell>
                    {showPesoAprox && <TableCell className="text-sm font-medium whitespace-nowrap">{formatPesoAprox(totalPeso, first.tipo_caminhao)}</TableCell>}
                    <TableCell className="text-sm">{first.tipo_frete ?? "—"}</TableCell>
                    {hasActions && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {(isAdmin || isLogistica) && first.carga_id && onPrintCarga && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Imprimir Romaneio" onClick={() => onPrintCarga(first.carga_id!)}>
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(isAdmin || isLogistica) && first.carga_id && onUndoCarga && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Desfazer Carga" onClick={() => onUndoCarga(first.carga_id!)}>
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canComplete && first.etapa === "vendas" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Completar logística" onClick={() => onComplete(first)}>
                              <ClipboardCheck className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => group.items.length > 1 ? toggle(group.codigoCliente!) : onEdit(first)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => group.items.forEach(i => onDelete(i.id))}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>

                  {isOpen && group.items.map((c) => (
                    <TableRow
                      key={c.id}
                      className={cn(
                        "hover:bg-muted/20 bg-primary/[0.02]",
                        c.ruptura && "bg-amber-50/40 dark:bg-amber-950/20"
                      )}
                    >
                      {selectable && (
                        <TableCell className="w-[40px]">
                          <Checkbox checked={selectedSet.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                        </TableCell>
                      )}
                      <TableCell />
                      {!hideColumns.includes("etapa") && <TableCell />}
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-sm font-mono">
                        <span className="flex items-center gap-1.5">
                          {c.codigo_produto ?? "—"}
                          {c.ruptura && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase">
                              <AlertTriangle className="h-3 w-3" /> Ruptura
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{c.nome_produto ?? "—"}</TableCell>
                      {!hideColumns.includes("peso") && <TableCell className="text-sm text-right font-medium">{(c.peso ?? 0).toLocaleString("pt-BR")}</TableCell>}
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      {showPesoAprox && <TableCell className="text-sm font-medium whitespace-nowrap">{formatPesoAprox(c.peso, c.tipo_caminhao)}</TableCell>}
                      <TableCell />
                      {hasActions && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            {canComplete && c.etapa === "vendas" && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Completar logística" onClick={() => onComplete(c)}>
                                <ClipboardCheck className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canEdit && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {showProxy && (
        <div
          ref={bottomProxyRef}
          onScroll={handleBottomProxyScroll}
          className="sticky bottom-0 z-20 overflow-x-auto overflow-y-hidden bg-muted/30 border-t border-border"
          style={{ height: 12 }}
        >
          <div style={{ width: proxyWidth, height: 1 }} />
        </div>
      )}
    </div>
  );
}
