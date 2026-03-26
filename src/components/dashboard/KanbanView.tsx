import { Card, CardContent } from "@/components/ui/card";
import { EtapaBadge } from "./EtapaBadge";
import { STATUSES, STATUS_COLORS, RUPTURA_STATUSES, type CarregamentoStatus } from "@/lib/constants";
import type { Carregamento } from "@/hooks/useCarregamentos";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface Props {
  data: Carregamento[];
  onStatusChange: (id: string, status: string) => void;
}

const COLUMN_BORDER: Record<CarregamentoStatus, string> = {
  'Aguardando': 'border-t-status-aguardando',
  'Separando': 'border-t-status-separando',
  'Pronto para carregar': 'border-t-status-pronto',
  'Carregando': 'border-t-status-carregando',
  'Carregado': 'border-t-status-carregado',
  'Pendente / Problema': 'border-t-status-problema',
};

export function KanbanView({ data, onStatusChange }: Props) {
  // Filter out items that have ruptura-specific statuses (they belong in the Rupturas page)
  const dashboardData = data.filter((c) => !RUPTURA_STATUSES.includes(c.status as any) && c.etapa !== "logistica");

  return (
    <div className="flex lg:grid lg:grid-cols-6 gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
      {/* Each column has min-w on mobile for horizontal scroll */}
      {STATUSES.map((status) => {
        const items = dashboardData.filter((c) => c.status === status);
        return (
          <div key={status} className={cn("rounded-lg border border-border bg-muted/30 border-t-4 min-w-[260px] lg:min-w-0 snap-start shrink-0 lg:shrink", COLUMN_BORDER[status])}>
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide">{status}</span>
              <span className="text-xs text-muted-foreground font-mono">{items.length}</span>
            </div>
            <div className="p-2 space-y-2 min-h-[60px] sm:min-h-[100px]">
              {items.map((c) => (
                <Card key={c.id} className={cn("border-border/60 shadow-sm", c.ruptura && "border-l-4 border-l-amber-500")}>
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-end gap-1">
                        {c.ruptura && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                        <EtapaBadge etapa={c.etapa} />
                      </div>
                      <span className="text-xs font-semibold">{c.nome_produto || c.codigo_produto || "Sem produto"}</span>
                      {c.numero_pedido && <span className="text-[10px] text-muted-foreground font-mono">Pedido #{c.numero_pedido}</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div>{c.vendedores?.nome_vendedor ?? "—"}</div>
                      <div className="font-medium">{(c.peso ?? 0).toLocaleString("pt-BR")} kg</div>
                      {c.placa && <div className="font-mono uppercase">{c.placa}</div>}
                      {(c.cidade || c.uf) && <div>{[c.cidade, c.uf].filter(Boolean).join(" - ")}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
