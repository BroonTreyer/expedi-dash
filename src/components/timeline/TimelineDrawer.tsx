import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTimelinePedidoDistribuidor } from "@/hooks/useTimelinePedidoDistribuidor";
import {
  formatDataBrTime,
  formatDuracao,
  tempoRelativo,
  type MarcoTimelineKey,
} from "@/lib/timeline-utils";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  PackageCheck,
  CalendarClock,
  DoorOpen,
  Warehouse,
  Truck,
  CheckCircle2,
  CircleDashed,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string | null;
}

const ICONES: Record<MarcoTimelineKey, any> = {
  registrado: ClipboardList,
  pre_carga_fechada: PackageCheck,
  previsao_carregar: CalendarClock,
  chegada_portaria: DoorOpen,
  entrada_patio: Warehouse,
  expedido: Truck,
};

export function TimelineDrawer({ open, onOpenChange, pedidoId }: Props) {
  const { data, isLoading } = useTimelinePedidoDistribuidor(pedidoId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Linha do tempo do pedido</SheetTitle>
          <SheetDescription>
            {data?.pedido
              ? `#${data.pedido.numero_pedido ?? "—"} · ${data.pedido.cliente ?? ""}`
              : "Distribuidor"}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !data ? (
          <div className="mt-6 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <>
            {data.pedido?.carga_id && (
              <div className="mt-3 text-xs text-muted-foreground">
                Carga: <span className="font-mono">{data.pedido.carga_id}</span>
                {data.veiculo?.placa && <span className="ml-2">· {data.veiculo.placa}</span>}
              </div>
            )}

            <ol className="mt-5 relative border-l border-border ml-3 space-y-4">
              {data.marcos.map((m, idx) => {
                const Icon = ICONES[m.key];
                const concluido = !!m.data;
                const ultimoConcluido = concluido && data.marcos.slice(idx + 1).every((x) => !x.data);
                return (
                  <li key={m.key} className="ml-6">
                    <span
                      className={cn(
                        "absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background",
                        concluido
                          ? ultimoConcluido
                            ? "bg-primary text-primary-foreground"
                            : "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {concluido ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <CircleDashed className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={cn("text-sm font-medium", !concluido && "text-muted-foreground")}>
                        {m.label}
                      </span>
                    </div>
                    <div className="text-xs tabular-nums mt-0.5">
                      {concluido ? (
                        <>
                          <span>{formatDataBrTime(m.data)}</span>
                          <span className="text-muted-foreground ml-2">{tempoRelativo(m.data)}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">{m.detalhe || "—"}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 rounded-md border bg-muted/30 p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ciclo total</span>
                <span className="font-semibold tabular-nums">{formatDuracao(data.resumo.cicloTotalMin)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registro → pré-carga</span>
                <span className="tabular-nums">{formatDuracao(data.resumo.preCargaMin)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pré-carga → expedido</span>
                <span className="tabular-nums">{formatDuracao(data.resumo.ateExpedicaoMin)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tempo no pátio</span>
                <span className="tabular-nums">{formatDuracao(data.resumo.patioMin)}</span>
              </div>
            </div>

            {data.pedido?.ruptura && (
              <Badge variant="destructive" className="mt-3 text-[10px]">
                Pedido com ruptura
              </Badge>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}