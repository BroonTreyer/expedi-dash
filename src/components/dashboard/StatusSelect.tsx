import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUSES, STATUS_COLORS, type CarregamentoStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function StatusSelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs border-none p-1 px-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            <span className={cn("inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold", STATUS_COLORS[s])}>
              {s}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
