import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, PlayCircle, Pencil, X, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Carregamento } from "@/hooks/useCarregamentos";

export interface PreCargaGroup {
  cargaId: string;
  nomeCarga: string | null;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  tipoCaminhao: string | null;
  data: string;
  pesoTotal: number;
  qtdPedidos: number;
  destinos: string;
  items: Carregamento[];
}

interface Props {
  preCargas: PreCargaGroup[];
  onFinalize: (pc: PreCargaGroup) => void;
  onEdit: (pc: PreCargaGroup) => void;
  onCancel: (pc: PreCargaGroup) => void;
}

export function PreCargasPanel({ preCargas, onFinalize, onEdit, onCancel }: Props) {
  const [open, setOpen] = useState(true);
  const totalPedidos = useMemo(() => preCargas.reduce((s, p) => s + p.qtdPedidos, 0), [preCargas]);

  if (preCargas.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-500/10 rounded-t-lg"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-semibold">Pré-cargas</span>
        <Badge variant="outline" className="ml-1 h-5 text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-300">
          {preCargas.length} {preCargas.length === 1 ? "carga" : "cargas"} · {totalPedidos} pedidos
        </Badge>
        <span className="ml-auto text-[11px] text-muted-foreground hidden sm:inline">
          Pedidos reservados — finalize para virar carga real.
        </span>
      </button>
      {open && (
        <div className="divide-y divide-amber-500/20">
          {preCargas.map((pc) => (
            <div key={pc.cargaId} className="px-3 py-2 flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">
                    {pc.nomeCarga || pc.cargaId}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {pc.qtdPedidos} pedidos
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {pc.pesoTotal.toLocaleString("pt-BR")} kg
                  </Badge>
                  {pc.tipoCaminhao && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Truck className="h-3 w-3" /> {pc.tipoCaminhao}
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {[pc.placa, pc.motorista, pc.transportadora].filter(Boolean).join(" · ") || "Sem veículo definido"}
                  {pc.destinos && <> · {pc.destinos}</>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => onFinalize(pc)}>
                  <PlayCircle className="h-3.5 w-3.5" /> Finalizar
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onEdit(pc)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className={cn("h-7 text-xs gap-1 text-destructive hover:text-destructive")} onClick={() => onCancel(pc)}>
                  <X className="h-3.5 w-3.5" /> Cancelar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}