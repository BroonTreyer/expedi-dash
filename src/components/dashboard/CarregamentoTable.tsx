import { useState, useMemo, Fragment } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusSelect } from "./StatusSelect";
import { EtapaBadge } from "./EtapaBadge";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Trash2, Edit, ClipboardCheck, AlertTriangle, ChevronRight, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Carregamento } from "@/hooks/useCarregamentos";
import type { AppRole } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Props {
  data: Carregamento[];
  onStatusChange: (id: string, status: string) => void;
  onEdit: (c: Carregamento) => void;
  onDelete: (id: string) => void;
  onComplete: (c: Carregamento) => void;
  userRole?: AppRole | null;
  statuses?: readonly string[];
  statusColors?: Record<string, string>;
  showPesoAprox?: boolean;
  hideColumns?: string[];
}

interface Group {
  pedido: number | null;
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
  const groups: Group[] = [];
  for (const c of data) {
    const last = groups[groups.length - 1];
    if (c.numero_pedido !== null && last && last.pedido === c.numero_pedido) {
      last.items.push(c);
    } else {
      groups.push({ pedido: c.numero_pedido, items: [c] });
    }
  }
  return groups;
}

// ─── Mobile ───

function MobileCardView({ data, onStatusChange, onEdit, onDelete, onComplete, userRole, statuses, statusColors, showPesoAprox, hideColumns = [] }: Props) {
  const isAdmin = userRole === "admin";
  const isLogistica = userRole === "logistica";
  const isFaturamento = userRole === "faturamento";
  const canChangeStatus = isAdmin || isLogistica || isFaturamento;
  const canEdit = isAdmin || isFaturamento;
  const canComplete = isAdmin || isLogistica;
  const hasActions = isAdmin || isLogistica || isFaturamento;
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const groups = useMemo(() => buildGroups(data), [data]);

  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Nenhum carregamento encontrado</div>;
  }

  const toggle = (pedido: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(pedido) ? next.delete(pedido) : next.add(pedido);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isMulti = group.pedido !== null && group.items.length > 1;
        if (isMulti) {
          const first = group.items[0];
          const isOpen = expanded.has(group.pedido!);
          const totalPeso = group.items.reduce((s, i) => s + (i.peso ?? 0), 0);
          const totalQtd = group.items.reduce((s, i) => s + (i.quantidade ?? 0), 0);
          return (
            <div key={group.items[0].id} className="rounded-lg border-2 border-primary/20 overflow-hidden">
              <button
                type="button"
                className="w-full bg-primary/5 px-3 py-2 flex items-center justify-between gap-2 hover:bg-primary/10 transition-colors"
                onClick={() => toggle(group.pedido!)}
              >
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
                  <span className="text-xs font-mono font-bold text-primary">Pedido #{group.pedido}</span>
                  {!hideColumns.includes("etapa") && <EtapaBadge etapa={first.etapa} />}
                  <StatusBadge status={first.status} statusColors={statusColors} />
                </div>
                <span className="text-xs text-muted-foreground">{group.items.length} itens · {totalQtd} un · {totalPeso.toLocaleString("pt-BR")} kg</span>
              </button>
              {isOpen && (
                <div className="divide-y divide-border/40">
                  {group.items.map((c, idx) => (
                    <MobileCardItem key={c.id} c={c} isAdmin={isAdmin} canEdit={canEdit} canComplete={canComplete} hasActions={hasActions} canChangeStatus={canChangeStatus} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} statuses={statuses} statusColors={statusColors} showPesoAprox={showPesoAprox} hideColumns={hideColumns} isGrouped={idx > 0} />
                  ))}
                </div>
              )}
            </div>
          );
        }
        const c = group.items[0];
        return <MobileCardItem key={c.id} c={c} isAdmin={isAdmin} canEdit={canEdit} canComplete={canComplete} hasActions={hasActions} canChangeStatus={canChangeStatus} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} statuses={statuses} statusColors={statusColors} showPesoAprox={showPesoAprox} hideColumns={hideColumns} isGrouped={false} />;
      })}
    </div>
  );
}

function MobileCardItem({ c, isAdmin, canEdit, hasActions, canChangeStatus, onStatusChange, onEdit, onDelete, onComplete, statuses, statusColors, showPesoAprox, hideColumns = [], isGrouped }: {
  c: Carregamento; isAdmin: boolean; canEdit: boolean; hasActions: boolean; canChangeStatus: boolean;
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
            {c.etapa === "vendas" && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Completar logística" onClick={() => onComplete(c)}>
                <ClipboardCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            {canEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            {isAdmin && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {!isGrouped && c.numero_pedido && (
          <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">#{c.numero_pedido}</span>
        )}
        <span className="font-medium text-sm">{c.nome_produto || c.codigo_produto || "Sem produto"}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {!isGrouped && (
          <>
            <div className="text-muted-foreground">Vendedor</div>
            <div>{c.vendedores?.nome_vendedor ?? "—"}</div>
          </>
        )}
        {!hideColumns.includes("qtd") && !hideColumns.includes("peso") && (
          <>
            <div className="text-muted-foreground">Qtd / Peso</div>
            <div className="font-medium">{c.quantidade ?? 0} un / {(c.peso ?? 0).toLocaleString("pt-BR")} kg</div>
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
            <div>{c.cliente ?? "—"}</div>
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

export function CarregamentoTable({ data, onStatusChange, onEdit, onDelete, onComplete, userRole, statuses, statusColors, showPesoAprox, hideColumns = [] }: Props) {
  const isMobile = useIsMobile();
  const isAdmin = userRole === "admin";
  const isLogistica = userRole === "logistica";
  const isFaturamento = userRole === "faturamento";
  const canChangeStatus = isAdmin || isLogistica || isFaturamento;
  const canEdit = isAdmin || isFaturamento;
  const hasActions = isAdmin || isLogistica || isFaturamento;
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const groups = useMemo(() => buildGroups(data), [data]);

  if (isMobile) {
    return <MobileCardView data={data} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} userRole={userRole} statuses={statuses} statusColors={statusColors} showPesoAprox={showPesoAprox} hideColumns={hideColumns} />;
  }

  const toggle = (pedido: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(pedido) ? next.delete(pedido) : next.add(pedido);
      return next;
    });
  };

  const colCount = 11
    + (hideColumns.includes("etapa") ? 0 : 1)
    + (hideColumns.includes("qtd") ? 0 : 1)
    + (hideColumns.includes("peso") ? 0 : 1)
    + (showPesoAprox ? 1 : 0)
    + (hasActions ? 1 : 0);

  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-[32px]"></TableHead>
            <TableHead className="w-[80px]">N. Pedido</TableHead>
            {!hideColumns.includes("etapa") && <TableHead className="w-[120px]">Etapa</TableHead>}
            <TableHead className="w-[160px]">Status</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead>Cód. Produto</TableHead>
            <TableHead>Produto</TableHead>
            {!hideColumns.includes("qtd") && <TableHead className="text-right">Qtd</TableHead>}
            {!hideColumns.includes("peso") && <TableHead className="text-right">Peso (kg)</TableHead>}
            <TableHead>Caminhão</TableHead>
            <TableHead>Motorista</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>UF</TableHead>
            {showPesoAprox && <TableHead>Peso Aprox.</TableHead>}
            <TableHead>Início</TableHead>
            <TableHead>Fim</TableHead>
            <TableHead>Obs</TableHead>
            {hasActions && <TableHead className="w-[110px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colCount + 1} className="text-center py-8 text-muted-foreground">
                Nenhum carregamento encontrado
              </TableCell>
            </TableRow>
          )}
          {groups.map((group) => {
            const isMulti = group.pedido !== null && group.items.length > 1;

            // Single item or null pedido — render normal row
            if (!isMulti) {
              const c = group.items[0];
              return (
                <TableRow key={c.id} className={cn("hover:bg-muted/30", c.ruptura && "bg-amber-50/40 dark:bg-amber-950/20")}>
                  <TableCell />
                  <TableCell className="text-sm font-mono font-medium text-primary">{c.numero_pedido ?? "—"}</TableCell>
                  {!hideColumns.includes("etapa") && (
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <EtapaBadge etapa={c.etapa} />
                        {c.ruptura && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    {canChangeStatus ? (
                      <StatusSelect value={c.status} onChange={(s) => onStatusChange(c.id, s)} statuses={statuses} statusColors={statusColors} />
                    ) : (
                      <span className="text-sm">{c.status}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{c.vendedores?.nome_vendedor ?? "—"}</TableCell>
                  <TableCell className="text-sm font-mono">{c.codigo_produto ?? "—"}</TableCell>
                  <TableCell className="text-sm">{c.nome_produto ?? "—"}</TableCell>
                  {!hideColumns.includes("qtd") && <TableCell className="text-sm text-right">{c.quantidade ?? 0}</TableCell>}
                  {!hideColumns.includes("peso") && <TableCell className="text-sm text-right font-medium">{(c.peso ?? 0).toLocaleString("pt-BR")}</TableCell>}
                  <TableCell><PendingCell value={c.tipo_caminhao} /></TableCell>
                  <TableCell><PendingCell value={c.motorista} /></TableCell>
                  <TableCell className="text-sm">{c.cliente ?? "—"}</TableCell>
                  <TableCell className="text-sm">{c.uf ?? "—"}</TableCell>
                  {showPesoAprox && <TableCell className="text-sm font-medium whitespace-nowrap">{formatPesoAprox(c.peso, c.tipo_caminhao)}</TableCell>}
                  <TableCell className="text-sm">{formatTime(c.horario_inicio)}</TableCell>
                  <TableCell className="text-sm">{formatTime(c.horario_fim)}</TableCell>
                  <TableCell className="text-sm max-w-[120px] truncate" title={c.observacoes ?? ""}>{c.observacoes || "—"}</TableCell>
                  {hasActions && (
                    <TableCell>
                      <div className="flex gap-1">
                        {c.etapa === "vendas" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Completar logística" onClick={() => onComplete(c)}>
                            <ClipboardCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isAdmin && (
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

            // Multi-item group — accordion
            const first = group.items[0];
            const isOpen = expanded.has(group.pedido!);
            const totalQtd = group.items.reduce((s, i) => s + (i.quantidade ?? 0), 0);
            const totalPeso = group.items.reduce((s, i) => s + (i.peso ?? 0), 0);
            const hasRuptura = group.items.some(i => i.ruptura);

            return (
              <Fragment key={`group-${group.pedido}`}>
                {/* Summary row */}
                <TableRow
                  className={cn(
                    "hover:bg-muted/30 cursor-pointer border-t-2 border-t-primary/30 bg-primary/[0.03]",
                    hasRuptura && "bg-amber-50/40 dark:bg-amber-950/20",
                    !isOpen && "border-b"
                  )}
                  onClick={() => toggle(group.pedido!)}
                >
                  <TableCell className="px-2">
                    {isOpen
                      ? <ChevronDown className="h-4 w-4 text-primary" />
                      : <ChevronRight className="h-4 w-4 text-primary" />
                    }
                  </TableCell>
                  <TableCell className="text-sm font-mono font-bold text-primary">{group.pedido}</TableCell>
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
                      <StatusSelect value={first.status} onChange={(s) => onStatusChange(first.id, s)} statuses={statuses} statusColors={statusColors} />
                    ) : (
                      <span className="text-sm">{first.status}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{first.vendedores?.nome_vendedor ?? "—"}</TableCell>
                  {/* Product summary spanning code + name */}
                  <TableCell colSpan={2} className="text-sm text-muted-foreground italic">
                    {group.items.length} produtos
                  </TableCell>
                  {!hideColumns.includes("qtd") && <TableCell className="text-sm text-right font-semibold">{totalQtd}</TableCell>}
                  {!hideColumns.includes("peso") && <TableCell className="text-sm text-right font-semibold">{totalPeso.toLocaleString("pt-BR")}</TableCell>}
                  <TableCell><PendingCell value={first.tipo_caminhao} /></TableCell>
                  <TableCell><PendingCell value={first.motorista} /></TableCell>
                  <TableCell className="text-sm">{first.cliente ?? "—"}</TableCell>
                  <TableCell className="text-sm">{first.uf ?? "—"}</TableCell>
                  {showPesoAprox && <TableCell className="text-sm font-medium whitespace-nowrap">{formatPesoAprox(totalPeso, first.tipo_caminhao)}</TableCell>}
                  <TableCell className="text-sm">{formatTime(first.horario_inicio)}</TableCell>
                  <TableCell className="text-sm">{formatTime(first.horario_fim)}</TableCell>
                  <TableCell />
                  {hasActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {first.etapa === "vendas" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Completar logística" onClick={() => onComplete(first)}>
                            <ClipboardCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(first)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(first.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>

                {/* Expanded child rows */}
                {isOpen && group.items.map((c) => (
                  <TableRow
                    key={c.id}
                    className={cn(
                      "hover:bg-muted/20 bg-primary/[0.02]",
                      c.ruptura && "bg-amber-50/40 dark:bg-amber-950/20"
                    )}
                  >
                    <TableCell />
                    <TableCell />
                    {!hideColumns.includes("etapa") && (
                      <TableCell>
                        {c.ruptura && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                      </TableCell>
                    )}
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-sm font-mono">{c.codigo_produto ?? "—"}</TableCell>
                    <TableCell className="text-sm">{c.nome_produto ?? "—"}</TableCell>
                    {!hideColumns.includes("qtd") && <TableCell className="text-sm text-right">{c.quantidade ?? 0}</TableCell>}
                    {!hideColumns.includes("peso") && <TableCell className="text-sm text-right font-medium">{(c.peso ?? 0).toLocaleString("pt-BR")}</TableCell>}
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    {showPesoAprox && <TableCell className="text-sm font-medium whitespace-nowrap">{formatPesoAprox(c.peso, c.tipo_caminhao)}</TableCell>}
                    <TableCell className="text-sm">{formatTime(c.horario_inicio)}</TableCell>
                    <TableCell className="text-sm">{formatTime(c.horario_fim)}</TableCell>
                    <TableCell className="text-sm max-w-[120px] truncate" title={c.observacoes ?? ""}>{c.observacoes || "—"}</TableCell>
                    {hasActions && <TableCell />}
                  </TableRow>
                ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
