import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, type CarregamentoStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  status: string;
  statusColors?: Record<string, string>;
}

export function StatusBadge({ status, statusColors }: Props) {
  const allColors = statusColors ?? STATUS_COLORS;
  const colors = allColors[status as CarregamentoStatus] ?? "bg-muted text-foreground";
  return (
    <Badge className={cn("text-[13px] font-semibold whitespace-nowrap", colors)}>
      {status}
    </Badge>
  );
}
