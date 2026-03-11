import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusSelect } from "./StatusSelect";
import { EtapaBadge } from "./EtapaBadge";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Edit, ClipboardCheck, AlertTriangle } from "lucide-react";
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

function MobileCardView({ data, onStatusChange, onEdit, onDelete, onComplete, userRole, statuses, statusColors, showPesoAprox, hideColumns = [] }: Props) {
  const isAdmin = userRole === "admin";
  const isLogistica = userRole === "logistica";
  const canChangeStatus = isAdmin || isLogistica;

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum carregamento encontrado
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((c) => (
        <Card key={c.id} className={cn("border-border/60", c.ruptura && "border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20")}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {!hideColumns.includes("etapa") && <EtapaBadge etapa={c.etapa} />}
                <StatusBadge status={c.status} statusColors={statusColors} />
                {c.ruptura && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase">
                    <AlertTriangle className="h-3 w-3" /> Ruptura
                  </span>
                )}
              </div>
              {(isAdmin || isLogistica) && (
                <div className="flex gap-1 shrink-0">
                  {c.etapa === "vendas" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Completar logística" onClick={() => onComplete(c)}>
                      <ClipboardCheck className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {c.numero_pedido && (
                  <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">#{c.numero_pedido}</span>
                )}
                <span className="font-medium text-sm">{c.nome_produto || c.codigo_produto || "Sem produto"}</span>
              </div>
              <div className="text-xs text-muted-foreground">{c.vendedores?.nome_vendedor ?? "—"}</div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
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
              <div className="text-muted-foreground">Caminhão</div>
              <div>{c.tipo_caminhao || <span className="text-muted-foreground/60 italic">Pendente</span>}</div>
              <div className="text-muted-foreground">Motorista</div>
              <div>{c.motorista || <span className="text-muted-foreground/60 italic">Pendente</span>}</div>
              <div className="text-muted-foreground">Cliente</div>
              <div>{c.cliente ?? "—"}</div>
              <div className="text-muted-foreground">UF</div>
              <div>{c.uf ?? "—"}</div>
            </div>

            {canChangeStatus && (
              <div className="pt-1 border-t border-border">
                <StatusSelect value={c.status} onChange={(s) => onStatusChange(c.id, s)} statuses={statuses} statusColors={statusColors} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CarregamentoTable({ data, onStatusChange, onEdit, onDelete, onComplete, userRole, statuses, statusColors, showPesoAprox, hideColumns = [] }: Props) {
  const isMobile = useIsMobile();
  const isAdmin = userRole === "admin";
  const isLogistica = userRole === "logistica";
  const canChangeStatus = isAdmin || isLogistica;

  if (isMobile) {
    return <MobileCardView data={data} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} userRole={userRole} statuses={statuses} statusColors={statusColors} showPesoAprox={showPesoAprox} hideColumns={hideColumns} />;
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
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
            {(isAdmin || isLogistica) && <TableHead className="w-[110px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={99} className="text-center py-8 text-muted-foreground">
                Nenhum carregamento encontrado
              </TableCell>
            </TableRow>
          )}
          {data.map((c, idx) => {
            // Determine if this row starts a new pedido group for visual grouping
            const prevPedido = idx > 0 ? data[idx - 1].numero_pedido : null;
            const isNewGroup = c.numero_pedido !== null && c.numero_pedido !== prevPedido;
            const isGrouped = c.numero_pedido !== null && idx > 0 && c.numero_pedido === prevPedido;

            return (
              <TableRow
                key={c.id}
                className={cn(
                  "hover:bg-muted/30",
                  c.ruptura && "bg-amber-50/40 dark:bg-amber-950/20",
                  isNewGroup && "border-t-2 border-t-primary/30",
                  isGrouped && "bg-muted/10"
                )}
              >
                <TableCell className="text-sm font-mono font-medium text-primary">
                  {c.numero_pedido ?? "—"}
                </TableCell>
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
              <TableCell className="text-sm max-w-[120px] truncate" title={c.observacoes ?? ""}>
                {c.observacoes || "—"}
              </TableCell>
              {(isAdmin || isLogistica) && (
                <TableCell>
                  <div className="flex gap-1">
                    {(isAdmin || isLogistica) && c.etapa === "vendas" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Completar logística" onClick={() => onComplete(c)}>
                        <ClipboardCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
