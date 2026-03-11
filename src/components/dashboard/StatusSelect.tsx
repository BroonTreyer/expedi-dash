import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUSES, STATUS_COLORS, type CarregamentoStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  statuses?: readonly string[];
  statusColors?: Record<string, string>;
}

export function StatusSelect({ value, onChange, statuses, statusColors }: Props) {
  const items = statuses ?? STATUSES;
  const colors = statusColors ?? STATUS_COLORS;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs border-none p-1 px-2 focus:ring-0 focus:ring-offset-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((s) => (
          <SelectItem key={s} value={s}>
            <span className={cn("inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold", colors[s as CarregamentoStatus] ?? "bg-muted text-foreground")}>
              {s}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
