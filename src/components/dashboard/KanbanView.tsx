import { Card, CardContent } from "@/components/ui/card";
import { EtapaBadge } from "./EtapaBadge";
import { STATUSES, STATUS_COLORS, type CarregamentoStatus } from "@/lib/constants";
import type { Carregamento } from "@/hooks/useCarregamentos";
import { cn } from "@/lib/utils";

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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {STATUSES.map((status) => {
        const items = data.filter((c) => c.status === status);
        return (
          <div key={status} className={cn("rounded-lg border border-border bg-muted/30 border-t-4", COLUMN_BORDER[status])}>
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide">{status}</span>
              <span className="text-xs text-muted-foreground font-mono">{items.length}</span>
            </div>
            <div className="p-2 space-y-2 min-h-[60px] sm:min-h-[100px]">
              {items.map((c) => (
                <Card key={c.id} className="border-border/60 shadow-sm">
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold">{c.nome_produto || c.codigo_produto || "Sem produto"}</span>
                      <EtapaBadge etapa={c.etapa} />
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div>{c.vendedores?.nome_vendedor ?? "—"}</div>
                      <div className="font-medium">{(c.peso ?? 0).toLocaleString("pt-BR")} kg</div>
                      {c.placa && <div className="font-mono uppercase">{c.placa}</div>}
                      {c.uf && <div>{c.uf}</div>}
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
