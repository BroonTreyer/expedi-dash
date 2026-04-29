import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Clock, Hourglass, Weight } from "lucide-react";
import type { CargaFechadaAguardando } from "@/hooks/useCarregamentos";

interface Props {
  cargas: CargaFechadaAguardando[];
}

export function PainelCargasFechadas({ cargas }: Props) {
  return (
    <Card className="overflow-hidden border-indigo-600/40 shadow-md">
      <CardHeader className="py-3 px-4 bg-indigo-600 text-white">
        <CardTitle className="text-base flex items-center gap-2 font-bold">
          <Package className="h-5 w-5" />
          Cargas fechadas — aguardando veículo
          <Badge className="ml-auto bg-white text-indigo-700 hover:bg-white text-sm font-bold px-2.5">
            {cargas.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {cargas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma carga aguardando</p>
        ) : (
          cargas.map((c, idx) => (
            <div
              key={c.carga_id}
              className={`rounded-md border border-l-4 ${c.chegouAguardandoLiberacao ? "border-l-amber-500" : "border-l-indigo-600"} ${idx % 2 === 0 ? "bg-background" : "bg-muted/40"} p-3 space-y-1.5`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-base truncate">{c.nome_carga || c.carga_id}</span>
                {c.chegouAguardandoLiberacao ? (
                  <Badge className="bg-amber-500 text-black hover:bg-amber-500 text-xs h-6 gap-0.5">
                    <Hourglass className="h-3 w-3" /> Motorista chegou
                  </Badge>
                ) : null}
                <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-200 text-xs h-6 font-mono">
                  <Package className="h-3 w-3 mr-1" />
                  {c.qtd_pedidos} {c.qtd_pedidos === 1 ? "pedido" : "pedidos"}
                </Badge>
                <Badge className="bg-indigo-600 text-white hover:bg-indigo-600 text-sm h-6 gap-1 font-bold">
                  <Weight className="h-3 w-3" />
                  {c.peso_total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg
                </Badge>
                <Badge variant="outline" className="text-xs h-6 gap-0.5">
                  <Clock className="h-3 w-3" /> {c.data}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                {c.placa && (
                  <span className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" /> Placa prevista: <span className="font-mono font-bold text-foreground">{c.placa}</span>
                  </span>
                )}
                {c.motorista && <span>Motorista: <span className="text-foreground font-medium">{c.motorista}</span></span>}
                {c.transportadora && <span>Transp.: <span className="text-foreground font-medium">{c.transportadora}</span></span>}
                {c.tipo_caminhao && <span>Tipo: <span className="text-foreground">{c.tipo_caminhao}</span></span>}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
