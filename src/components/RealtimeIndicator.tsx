import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  connected: "Tempo real ativo",
  connecting: "Conectando...",
  disconnected: "Desconectado",
};

export function RealtimeIndicator() {
  const status = useRealtimeStatus();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default select-none">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              status === "connected" && "bg-emerald-500 shadow-[0_0_4px_theme(colors.emerald.400)]",
              status === "connecting" && "bg-amber-500 animate-pulse",
              status === "disconnected" && "bg-destructive"
            )}
          />
          {status === "connected" ? "Online" : status === "connecting" ? "..." : "Offline"}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{labels[status]}</p>
      </TooltipContent>
    </Tooltip>
  );
}
