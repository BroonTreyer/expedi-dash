import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, type CarregamentoStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status as CarregamentoStatus] ?? "bg-muted text-foreground";
  return (
    <Badge className={cn("text-[11px] font-semibold whitespace-nowrap", colors)}>
      {status}
    </Badge>
  );
}
