import { Clock, ParkingCircle, Package, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EtapaPortaria, StatusPortariaInfo } from "@/hooks/useStatusPortariaPorCarga";
import { format } from "date-fns";

const STYLE: Record<EtapaPortaria, { className: string; Icon: any }> = {
  aguardando: {
    className: "bg-muted text-muted-foreground border-border hover:bg-muted",
    Icon: Clock,
  },
  patio: {
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
    Icon: ParkingCircle,
  },
  carregando: {
    className: "bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    Icon: Package,
  },
  expedido: {
    className: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    Icon: CheckCircle2,
  },
};

function fmtHora(iso: string | null) {
  if (!iso) return null;
  try { return format(new Date(iso), "dd/MM HH:mm"); } catch { return null; }
}

interface Props {
  info: StatusPortariaInfo | undefined;
  className?: string;
}

export function PortariaStatusBadge({ info, className }: Props) {
  const data: StatusPortariaInfo = info ?? { etapa: "aguardando", label: "Aguardando chegada", chegada: null, saida: null };
  const { className: cls, Icon } = STYLE[data.etapa];
  const chegada = fmtHora(data.chegada);
  const saida = fmtHora(data.saida);

  const badge = (
    <Badge
      variant="outline"
      className={cn("gap-1 text-[11px] font-semibold whitespace-nowrap rounded-md", cls, className)}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {data.label}
    </Badge>
  );

  if (!chegada && !saida) {
    return <span className="inline-flex">{badge}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild><span className="inline-flex">{badge}</span></TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {chegada && <div>Chegou às {chegada}</div>}
        {saida && <div>Saiu às {saida}</div>}
      </TooltipContent>
    </Tooltip>
  );
}