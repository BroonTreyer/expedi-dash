import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Clock, Weight, PackageCheck, CheckCircle2 } from "lucide-react";
import type { CargaDiaExpedicao } from "@/hooks/useCargasDiaExpedicao";

interface CargaExpedidaItem extends CargaDiaExpedicao {
  horarioSaida: string | null; // ISO string
}

interface Props {
  cargas: CargaExpedidaItem[];
}

const fmtHora = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

export function PainelCargasFechadas({ cargas }: Props) {
  return (
    <Card className="overflow-hidden border-emerald-600/30 shadow-sm">
      <CardHeader className="py-3 px-4 bg-emerald-600 text-white">
        <CardTitle className="text-base flex items-center gap-2 font-bold">
          <PackageCheck className="h-5 w-5" />
          Cargas expedidas do dia
          <Badge className="ml-auto bg-white text-emerald-700 hover:bg-white text-sm font-bold px-2.5">
            {cargas.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {cargas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma carga expedida ainda</p>
        ) : (
          cargas.map((c, idx) => {
            const hora = fmtHora(c.horarioSaida);
            return (
            <div
              key={c.carga_id}
              className={`rounded-md border border-l-4 border-l-emerald-500 ${idx % 2 === 0 ? "bg-background" : "bg-muted/40"} p-3 space-y-1.5`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-base truncate">{c.nome_carga || c.carga_id}</span>
                <Badge className="bg-emerald-500 text-white hover:bg-emerald-500 text-xs h-6 gap-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Expedida{hora ? ` · ${hora}` : ""}
                </Badge>
                <Badge variant="secondary" className="text-xs h-6 font-mono">
                  <Package className="h-3 w-3 mr-1" />
                  {c.qtdPedidos} {c.qtdPedidos === 1 ? "pedido" : "pedidos"}
                </Badge>
                <Badge className="bg-sidebar text-sidebar-foreground hover:bg-sidebar text-sm h-6 gap-1 font-bold">
                  <Weight className="h-3 w-3" />
                  {c.pesoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg
                </Badge>
                <Badge variant="outline" className="text-xs h-6 gap-0.5">
                  <Clock className="h-3 w-3" /> {c.data}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                {c.placa && (
                  <span className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" /> Placa: <span className="font-mono font-bold text-foreground">{c.placa}</span>
                  </span>
                )}
                {c.motorista && <span>Motorista: <span className="text-foreground font-medium">{c.motorista}</span></span>}
                {c.transportadora && <span>Transp.: <span className="text-foreground font-medium">{c.transportadora}</span></span>}
                {c.tipo_caminhao && <span>Tipo: <span className="text-foreground">{c.tipo_caminhao}</span></span>}
              </div>
            </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
