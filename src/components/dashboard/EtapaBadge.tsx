import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function EtapaBadge({ etapa }: { etapa: string }) {
  const isVendas = etapa === "vendas";
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-semibold whitespace-nowrap",
        isVendas
          ? "border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400"
          : "border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400"
      )}
    >
      {isVendas ? "Pendente Logística" : "Logística OK"}
    </Badge>
  );
}
