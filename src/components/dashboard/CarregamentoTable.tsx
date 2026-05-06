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
import { Trash2, Edit, ClipboardCheck, AlertTriangle, ChevronRight, ChevronDown, Undo2, Printer, PackageSearch, History, Link2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AuditTimeline } from "./AuditTimeline";
import { useCreatePortalToken } from "@/hooks/usePortalToken";

import { useIsMobile } from "@/hooks/use-mobile";
import type { Carregamento } from "@/hooks/useCarregamentos";
import type { AppRole } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { isRupturaParcial, pesoNaoCarregado } from "@/lib/peso-utils";
import { temRuptura } from "@/lib/ruptura-utils";

function ParcialBadge({ c }: { c: Carregamento }) {
  if (!isRupturaParcial(c)) return null;
  const original = c.peso_original ?? 0;
  const atual = c.peso ?? 0;
  const perdido = pesoNaoCarregado(c);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      title={`Original: ${original.toLocaleString("pt-BR")} kg → Carregado: ${atual.toLocaleString("pt-BR")} kg (−${perdido.toLocaleString("pt-BR")} kg)`}
    >
      <AlertTriangle className="h-3 w-3" /> Parcial
    </span>
  );
}

function RupturaBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
      <AlertTriangle className="h-3 w-3" /> Ruptura
    </span>
  );
}

interface Props {
  data: Carregamento[];
  currentDate?: string;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (c: Carregamento) => void;
  onEditGroup?: (items: Carregamento[]) => void;
  onDelete: (id: string) => void;
  onDeleteMany?: (ids: string[]) => void;
  onComplete: (c: Carregamento) => void;
  onClone?: (items: Carregamento[]) => void;
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

interface Group {
  key: string;
  codigoCliente: string | null;
  nomeCliente: string | null;
  numeroPedido: number | null;
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

function formatDateCompact(val: string | null | undefined) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  } catch {
    return "—";
  }
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
      // Unidade visual do pedido = (data + código do cliente).
      // Todos os produtos do mesmo cliente no mesmo dia ficam dentro do
      // mesmo bloco expansível — não tiramos produto de dentro do pedido.
      // Inclui numero_pedido na chave para que pedidos distintos do mesmo
      // cliente no mesmo dia apareçam como cards/linhas separados.
      const key = `${c.data}__${c.codigo_cliente}__${c.numero_pedido ?? "sn"}`;
      if (map.has(key)) {
        map.get(key)!.items.push(c);
      } else {
        map.set(key, { key, codigoCliente: c.codigo_cliente, nomeCliente: c.cliente, numeroPedido: c.numero_pedido, items: [c] });
      }
    } else {
      singles.push({ key: `single-${c.id}`, codigoCliente: c.codigo_cliente, nomeCliente: c.cliente, numeroPedido: c.numero_pedido, items: [c] });
    }
  }
  return [...map.values(), ...singles];
}

// ─── Mobile ───

function MobileCardView({ data, onStatusChange, onEdit, onEditGroup, onDelete, onDeleteMany, onComplete, onClone, userRole, statuses, statusColors, showPesoAprox, hideColumns = [], canChangeStatus: canChangeStatusProp }: Props) {
  const isAdmin = userRole === "admin";
  const isLogistica = userRole === "logistica";
  const isFaturamento = userRole === "faturamento";
  const canChangeStatus = canChangeStatusProp ?? (isAdmin || isLogistica || isFaturamento);
  const canEdit = isAdmin || isFaturamento;
  const canDelete = isAdmin || isFaturamento || isLogistica;
  const canComplete = isAdmin || isLogistica;
  const hasActions = isAdmin || isLogistica || isFaturamento;
  const portalMut = useCreatePortalToken();
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
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isMulti = group.codigoCliente !== null && group.items.length > 1;
        if (isMulti) {
          const first = group.items[0];
          const isOpen = expanded.has(group.key);
          const totalPeso = group.items.reduce((s, i) => s + (i.peso ?? 0), 0);
          const pedidosUnicos = Array.from(new Set(group.items.map(i => i.numero_pedido).filter((n): n is number => n != null)));
          const pedidoLabel = pedidosUnicos.length === 1
            ? `Pedido ${pedidosUnicos[0]}`
            : pedidosUnicos.length > 1
              ? `${pedidosUnicos.length} pedidos`
              : null;
          return (
            <div key={`g-${group.key}`} className="rounded-lg border-2 border-primary/20 overflow-hidden">
              <button
                type="button"
                className="w-full bg-primary/5 px-3 py-2 flex items-center justify-between gap-2 hover:bg-primary/10 transition-colors"
                onClick={() => toggle(group.key)}
              >
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
                  <span className="text-xs font-mono font-bold text-primary">
                    {group.codigoCliente} – {group.nomeCliente ?? "Sem nome"}
                    {pedidoLabel && <> · {pedidoLabel}</>}
                  </span>
                  {!hideColumns.includes("etapa") && <EtapaBadge etapa={first.etapa} />}
                  <StatusBadge status={first.status} statusColors={statusColors} />
                  {group.items.some(i => temRuptura(i)) && <RupturaBadge />}
                </div>
                <span className="text-xs text-muted-foreground">{group.items.length} produtos · {totalPeso.toLocaleString("pt-BR")} kg</span>
              </button>
              {isOpen && (
                <div className="divide-y divide-border/40">
                  {group.items.map((c, idx) => (
                    <MobileCardItem key={c.id} c={c} isAdmin={isAdmin} canEdit={canEdit} canDelete={canDelete} canComplete={canComplete} hasActions={hasActions} canChangeStatus={canChangeStatus} onStatusChange={onStatusChange} onEdit={onEdit} onEditGroup={onEditGroup} onDelete={onDelete} onDeleteMany={onDeleteMany} onComplete={onComplete} onClone={onClone} statuses={statuses} statusColors={statusColors} showPesoAprox={showPesoAprox} hideColumns={hideColumns} isGrouped={idx > 0} groupItems={group.items} />
                  ))}
                </div>
              )}
            </div>
          );
        }
        const c = group.items[0];
        return <MobileCardItem key={c.id} c={c} isAdmin={isAdmin} canEdit={canEdit} canDelete={canDelete} canComplete={canComplete} hasActions={hasActions} canChangeStatus={canChangeStatus} onStatusChange={onStatusChange} onEdit={onEdit} onEditGroup={onEditGroup} onDelete={onDelete} onDeleteMany={onDeleteMany} onComplete={onComplete} onClone={onClone} statuses={statuses} statusColors={statusColors} showPesoAprox={showPesoAprox} hideColumns={hideColumns} isGrouped={false} groupItems={group.items} />;
      })}
    </div>
  );
}

function MobileCardItem({ c, isAdmin, canEdit, canDelete, canComplete, hasActions, canChangeStatus, onStatusChange, onEdit, onEditGroup, onDelete, onDeleteMany, onComplete, onClone, statuses, statusColors, showPesoAprox, hideColumns = [], isGrouped, groupItems }: {
  c: Carregamento; isAdmin: boolean; canEdit: boolean; canDelete: boolean; canComplete: boolean; hasActions: boolean; canChangeStatus: boolean;
  onStatusChange: (id: string, s: string) => void; onEdit: (c: Carregamento) => void; onEditGroup?: (items: Carregamento[]) => void; onDelete: (id: string) => void; onDeleteMany?: (ids: string[]) => void; onComplete: (c: Carregamento) => void;
  onClone?: (items: Carregamento[]) => void;
  statuses?: readonly string[]; statusColors?: Record<string, string>; showPesoAprox?: boolean; hideColumns?: string[]; isGrouped: boolean; groupItems?: Carregamento[];
}) {
  // When this is the header row of a multi-item group, the trash icon deletes the whole order
  const isGroupHeader = !isGrouped && (groupItems?.length ?? 0) > 1;
  const handleDeleteClick = () => {
    if (isGroupHeader && onDeleteMany && groupItems) {
      onDeleteMany(groupItems.map(i => i.id));
    } else {
      onDelete(c.id);
    }
  };
  return (
    <CardContent className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {!isGrouped && !hideColumns.includes("etapa") && <EtapaBadge etapa={c.etapa} />}
          {!isGrouped && <StatusBadge status={c.status} statusColors={statusColors} />}
          {temRuptura(c) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase">
              <AlertTriangle className="h-3 w-3" /> Ruptura
            </span>
          )}
          <ParcialBadge c={c} />
        </div>
        {hasActions && (
          <div className="flex gap-1 shrink-0">
            {!isGrouped && canComplete && c.etapa === "vendas" && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Completar logística" onClick={() => onComplete(c)}>
                <ClipboardCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            {!isGrouped && canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Editar pedido completo"
                onClick={() => onEditGroup && groupItems ? onEditGroup(groupItems) : onEdit(c)}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            {!isGrouped && canEdit && onClone && (
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Clonar pedido" onClick={() => onClone(groupItems ?? [c])}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
            {!isGrouped && canDelete && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={isGroupHeader ? `Excluir pedido completo (${groupItems!.length} produtos)` : "Excluir"} onClick={handleDeleteClick}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <AuditTimeline
              entityType="carregamento"
              entityId={c.id}
              title={`Histórico - Pedido ${c.numero_pedido ?? ""}`}
              trigger={
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Histórico">
                  <History className="h-3.5 w-3.5" />
                </Button>
              }
            />
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
            {!hideColumns.includes("tipo_caminhao") && (
              <>
                <div className="text-muted-foreground">Caminhão</div>
                <div>{c.tipo_caminhao || <span className="text-muted-foreground/60 italic">Pendente</span>}</div>
              </>
            )}
            {!hideColumns.includes("motorista") && (
              <>
                <div className="text-muted-foreground">Motorista</div>
                <div>{c.motorista || <span className="text-muted-foreground/60 italic">Pendente</span>}</div>
              </>
            )}
            <div className="text-muted-foreground">Cliente</div>
            <div>{c.codigo_cliente ? `${c.codigo_cliente} – ${c.cliente ?? ""}` : (c.cliente ?? "—")}</div>
            <div className="text-muted-foreground">Cidade</div>
            <div>{c.cidade ?? "—"}</div>
            <div className="text-muted-foreground">UF</div>
            <div>{c.uf ?? "—"}</div>
            {!hideColumns.includes("nome_carga") && c.nome_carga && (
              <>
                <div className="text-muted-foreground">Carga</div>
                <div><Badge variant="outline" className="text-[10px] font-mono">{c.nome_carga}</Badge></div>
              </>
            )}
            {!isGrouped && (
              <>
                <div className="text-muted-foreground">Dt. Cadastro</div>
                <div>{formatDateCompact(c.created_at)}</div>
              </>
            )}
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

export function CarregamentoTable({ data, currentDate, onStatusChange, onEdit, onEditGroup, onDelete, onDeleteMany, onComplete, onClone, onUndoCarga, onPrintCarga, userRole, statuses, statusColors, showPesoAprox, hideColumns = [], canChangeStatus: canChangeStatusProp, selectable, selectedIds = [], onSelectionChange }: Props) {
  const isMobile = useIsMobile();
  const portalMut = useCreatePortalToken();
  const isAdmin = userRole === "admin";
  const isLogistica = userRole === "logistica";
  const isFaturamento = userRole === "faturamento";
  const canChangeStatus = canChangeStatusProp ?? (isAdmin || isLogistica || isFaturamento);
  const canEdit = isAdmin || isFaturamento || isLogistica;
  const canDelete = isAdmin || isFaturamento || isLogistica;
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
    nome_carga: (c) => c.nome_carga ?? "",
    created_at: (c) => c.created_at ?? "",
  }), []);

  const sortedData = useMemo(() => sortData(data, sortAccessors), [data, sortData, sortAccessors]);
  const groups = useMemo(() => buildGroups(sortedData), [sortedData]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allIds = useMemo(() => data.map(c => c.id), [data]);
  const allSelected = selectable && allIds.length > 0 && allIds.every(id => selectedSet.has(id));

  const toggleSelect = useCallback((id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id); else next.add(id);
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
    return <MobileCardView data={data} onStatusChange={onStatusChange} onEdit={onEdit} onEditGroup={onEditGroup} onDelete={onDelete} onDeleteMany={onDeleteMany} onComplete={onComplete} onClone={onClone} userRole={userRole} statuses={statuses} statusColors={statusColors} showPesoAprox={showPesoAprox} hideColumns={hideColumns} canChangeStatus={canChangeStatus} />;
  }

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const colCount = 10
    + (selectable ? 1 : 0)
    + (hideColumns.includes("etapa") ? 0 : 1)
    + (hideColumns.includes("peso") ? 0 : 1)
    + (hideColumns.includes("nome_carga") ? 0 : 1)
    + (hideColumns.includes("tipo_caminhao") ? 0 : 1)
    + (hideColumns.includes("motorista") ? 0 : 1)
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
              {!hideColumns.includes("etapa") && <SortableTableHead sort={sort} sortKey="etapa" onSort={toggleSort} className="w-[120px]">Etapa</SortableTableHead>}
              <SortableTableHead sort={sort} sortKey="status" onSort={toggleSort} className="w-[160px] text-center">Status</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="created_at" onSort={toggleSort}>Dt. Cadastro</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="vendedor" onSort={toggleSort}>Vendedor</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="codigo_produto" onSort={toggleSort}>Cód. Produto</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="nome_produto" onSort={toggleSort}>Produto</SortableTableHead>
              {!hideColumns.includes("peso") && <SortableTableHead sort={sort} sortKey="peso" onSort={toggleSort} className="text-right">Peso (kg)</SortableTableHead>}
              {!hideColumns.includes("tipo_caminhao") && <SortableTableHead sort={sort} sortKey="tipo_caminhao" onSort={toggleSort}>Caminhão</SortableTableHead>}
              {!hideColumns.includes("motorista") && <SortableTableHead sort={sort} sortKey="motorista" onSort={toggleSort}>Motorista</SortableTableHead>}
              <SortableTableHead sort={sort} sortKey="cliente" onSort={toggleSort}>Cliente</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="cidade" onSort={toggleSort}>Cidade</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="uf" onSort={toggleSort}>UF</SortableTableHead>
              {!hideColumns.includes("nome_carga") && <SortableTableHead sort={sort} sortKey="nome_carga" onSort={toggleSort}>Carga</SortableTableHead>}
              {showPesoAprox && <TableHead>Peso Aprox.</TableHead>}
              <SortableTableHead sort={sort} sortKey="tipo_frete" onSort={toggleSort}>Frete</SortableTableHead>
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
                  <TableRow key={c.id} className={cn("hover:bg-muted/30", temRuptura(c) && "bg-amber-50/40 dark:bg-amber-950/20")}>
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
                          
                          {temRuptura(c) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      {canChangeStatus ? (
                        <StatusSelect value={c.status} onChange={(s) => onStatusChange(c.id, s)} statuses={statuses} statusColors={statusColors} />
                      ) : (
                        <StatusBadge status={c.status} statusColors={statusColors} />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDateCompact(c.created_at)}</TableCell>
                    <TableCell className="text-sm">{c.vendedores?.nome_vendedor ?? "—"}</TableCell>
                    <TableCell className="text-sm font-mono">
                      <span className="flex items-center gap-1.5">
                        {c.codigo_produto ?? "—"}
                        {temRuptura(c) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                            <AlertTriangle className="h-3 w-3" /> Ruptura
                          </span>
                        )}
                        <ParcialBadge c={c} />
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{c.nome_produto ?? "—"}</TableCell>
                    {!hideColumns.includes("peso") && <TableCell className="text-sm text-right font-medium">{(c.peso ?? 0).toLocaleString("pt-BR")}</TableCell>}
                    {!hideColumns.includes("tipo_caminhao") && <TableCell><PendingCell value={c.tipo_caminhao} /></TableCell>}
                    {!hideColumns.includes("motorista") && <TableCell><PendingCell value={c.motorista} /></TableCell>}
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
                    {!hideColumns.includes("nome_carga") && (
                      <TableCell className="text-xs">
                        {c.nome_carga
                          ? <Badge variant="outline" className="text-xs font-mono">{c.nome_carga}</Badge>
                          : <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                    )}
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
                          {(isAdmin || isLogistica) && c.carga_id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Gerar Link Portal" disabled={portalMut.isPending} onClick={() => portalMut.mutate({ carga_id: c.carga_id!, nome_carga: c.nome_carga || undefined, placa: c.placa || undefined, motorista: c.motorista || undefined, transportadora: c.transportadora || undefined })}>
                              <Link2 className="h-3.5 w-3.5" />
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
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar pedido completo" onClick={() => onEditGroup ? onEditGroup(group.items) : onEdit(c)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canEdit && onClone && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Clonar pedido" onClick={() => onClone(group.items)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <AuditTimeline
                            entityType="carregamento"
                            entityId={c.id}
                            title={`Histórico - Pedido ${c.numero_pedido ?? ""}`}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Histórico">
                                <History className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              }

              // Multi-item group
              const first = group.items[0];
              const isOpen = expanded.has(group.key);
              const totalPeso = group.items.reduce((s, i) => s + (i.peso ?? 0), 0);
              const hasRuptura = group.items.some(i => temRuptura(i));
              const groupAllSelected = selectable && group.items.every(i => selectedSet.has(i.id));

              return (
                <Fragment key={`group-${group.key}`}>
                  <TableRow
                    className={cn(
                      "hover:bg-muted/30 cursor-pointer border-t-2 border-t-primary/30 bg-primary/[0.03]",
                      hasRuptura && "bg-amber-50/40 dark:bg-amber-950/20",
                      !isOpen && "border-b"
                    )}
                    onClick={() => toggle(group.key)}
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
                    <TableCell className="text-center">
                      {canChangeStatus ? (
                        <StatusSelect value={first.status} onChange={(s) => group.items.forEach(i => onStatusChange(i.id, s))} statuses={statuses} statusColors={statusColors} />
                      ) : (
                        <StatusBadge status={first.status} statusColors={statusColors} />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDateCompact(first.created_at)}</TableCell>
                    <TableCell className="text-sm">{first.vendedores?.nome_vendedor ?? "—"}</TableCell>
                    <TableCell colSpan={2} className="text-sm text-muted-foreground italic">
                      <span className="inline-flex items-center gap-1.5">
                        {group.items.length} produtos
                        {hasRuptura && <RupturaBadge />}
                      </span>
                    </TableCell>
                    {!hideColumns.includes("peso") && <TableCell className="text-sm text-right font-semibold">{totalPeso.toLocaleString("pt-BR")}</TableCell>}
                    {!hideColumns.includes("tipo_caminhao") && <TableCell><PendingCell value={first.tipo_caminhao} /></TableCell>}
                    {!hideColumns.includes("motorista") && <TableCell><PendingCell value={first.motorista} /></TableCell>}
                    <TableCell className="text-sm font-mono font-bold text-primary">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        {group.codigoCliente} – {group.nomeCliente ?? ""}
                        {(() => {
                          const pedidosUnicos = Array.from(new Set(group.items.map(i => i.numero_pedido).filter((n): n is number => n != null)));
                          if (pedidosUnicos.length === 0) return null;
                          const label = pedidosUnicos.length === 1 ? `Pedido ${pedidosUnicos[0]}` : `${pedidosUnicos.length} pedidos`;
                          const title = pedidosUnicos.length > 1 ? `Pedidos: ${pedidosUnicos.join(", ")}` : undefined;
                          return (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono" title={title}>
                              {label}
                            </Badge>
                          );
                        })()}
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
                    {!hideColumns.includes("nome_carga") && (
                      <TableCell className="text-xs">
                        {first.nome_carga
                          ? <Badge variant="outline" className="text-xs font-mono">{first.nome_carga}</Badge>
                          : <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                    )}
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
                          {(isAdmin || isLogistica) && first.carga_id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Gerar Link Portal" disabled={portalMut.isPending} onClick={() => portalMut.mutate({ carga_id: first.carga_id!, nome_carga: first.nome_carga || undefined, placa: first.placa || undefined, motorista: first.motorista || undefined, transportadora: first.transportadora || undefined })}>
                              <Link2 className="h-3.5 w-3.5" />
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Editar pedido completo"
                              onClick={() => {
                                if (onEditGroup) {
                                  onEditGroup(group.items);
                                } else {
                                  onEdit(first);
                                }
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canEdit && onClone && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Clonar pedido" onClick={() => onClone(group.items)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={`Excluir pedido completo (${group.items.length} produtos)`} onClick={() => onDeleteMany ? onDeleteMany(group.items.map(i => i.id)) : group.items.forEach(i => onDelete(i.id))}>
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
                        temRuptura(c) && "bg-amber-50/40 dark:bg-amber-950/20"
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
                      <TableCell />
                      <TableCell className="text-sm font-mono">
                        <span className="flex items-center gap-1.5">
                          {c.codigo_produto ?? "—"}
                          {temRuptura(c) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase">
                              <AlertTriangle className="h-3 w-3" /> Ruptura
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{c.nome_produto ?? "—"}</TableCell>
                      {!hideColumns.includes("peso") && <TableCell className="text-sm text-right font-medium">{(c.peso ?? 0).toLocaleString("pt-BR")}</TableCell>}
                      {!hideColumns.includes("tipo_caminhao") && <TableCell />}
                      {!hideColumns.includes("motorista") && <TableCell />}
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      {!hideColumns.includes("nome_carga") && <TableCell />}
                      {showPesoAprox && <TableCell className="text-sm font-medium whitespace-nowrap">{formatPesoAprox(c.peso, c.tipo_caminhao)}</TableCell>}
                      <TableCell />
                      {hasActions && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <AuditTimeline
                              entityType="carregamento"
                              entityId={c.id}
                              title={`Histórico - Pedido ${c.numero_pedido ?? ""}`}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Histórico">
                                  <History className="h-3.5 w-3.5" />
                                </Button>
                              }
                            />
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
