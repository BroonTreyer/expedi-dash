import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Clock, Hourglass, UserCheck } from "lucide-react";
import type { CargaFechadaAguardando } from "@/hooks/useCarregamentos";

interface Props {
  cargas: CargaFechadaAguardando[];
}

export function PainelCargasFechadas({ cargas }: Props) {
  return (
    <Card className="border-blue-500/30">
      <CardHeader className="py-3 px-4 bg-blue-500/5 border-b">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          Cargas fechadas aguardando veículo
          <Badge variant="outline" className="text-[10px] h-5 border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400">
            {cargas.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {cargas.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhuma carga aguardando</p>
        ) : (
          cargas.map((c) => (
            <div key={c.carga_id} className="rounded-md border bg-card p-3 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm truncate">{c.nome_carga || c.carga_id}</span>
                {c.chegouAguardandoLiberacao ? (
                  <Badge variant="outline" className="text-[10px] h-5 gap-0.5 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    <Hourglass className="h-3 w-3" /> Motorista chegou
                  </Badge>
                ) : null}
                <Badge variant="secondary" className="text-[10px] h-5 font-mono">
                  <Package className="h-3 w-3 mr-1" />
                  {c.qtd_pedidos} {c.qtd_pedidos === 1 ? "pedido" : "pedidos"}
                </Badge>
                <Badge variant="outline" className="text-[10px] h-5">
                  {c.peso_total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                </Badge>
                <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
                  <Clock className="h-3 w-3" /> {c.data}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                {c.placa && (
                  <span className="flex items-center gap-1">
                    <Truck className="h-3 w-3" /> Placa prevista: <span className="font-mono font-medium text-foreground">{c.placa}</span>
                  </span>
                )}
                {c.motorista && <span>Motorista: <span className="text-foreground">{c.motorista}</span></span>}
                {c.transportadora && <span>Transp.: <span className="text-foreground">{c.transportadora}</span></span>}
                {c.tipo_caminhao && <span>Tipo: {c.tipo_caminhao}</span>}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
