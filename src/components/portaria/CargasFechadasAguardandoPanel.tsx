import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Truck, LogIn, Clock } from "lucide-react";
import { useCargasFechadasAguardando, type CargaFechadaAguardando } from "@/hooks/useCarregamentos";
import { RegistroEntradaDialog } from "./RegistroEntradaDialog";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  /** Filter by carga categoria (PRÓPRIA = sem transportadora; TERCEIRIZADO = com transportadora) */
  categoria?: "carga_propria" | "terceirizado";
}

export function CargasFechadasAguardandoPanel({ categoria }: Props = {}) {
  const { role } = useAuth();
  const { data: cargasRaw = [], isLoading } = useCargasFechadasAguardando();
  const [prefill, setPrefill] = useState<CargaFechadaAguardando | null>(null);
  const [grupoDialog, setGrupoDialog] = useState<"PRÓPRIA" | "TERCEIRIZADO" | null>(null);

  const canAct = role === "admin" || role === "logistica" || role === "portaria";

  const cargas = cargasRaw.filter((c) => {
    if (!categoria) return true;
    const isPropria = !c.transportadora;
    return categoria === "carga_propria" ? isPropria : !isPropria;
  });

  if (isLoading || cargas.length === 0) return null;

  const openRegistro = (c: CargaFechadaAguardando, grupo: "PRÓPRIA" | "TERCEIRIZADO") => {
    setPrefill(c);
    setGrupoDialog(grupo);
  };

  return (
    <>
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Cargas fechadas aguardando veículo
            <Badge variant="outline" className="text-[10px] h-5 border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400">
              {cargas.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {cargas.map((c) => {
            const grupo: "PRÓPRIA" | "TERCEIRIZADO" = c.transportadora ? "TERCEIRIZADO" : "PRÓPRIA";
            return (
              <div key={c.carga_id} className="rounded-md border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm truncate">
                      {c.nome_carga || c.carga_id}
                    </span>
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

                {canAct && (
                  <div className="flex flex-col gap-1.5 shrink-0 sm:items-end">
                    <Button size="sm" className="h-8 text-xs gap-1" onClick={() => openRegistro(c, grupo)}>
                      <LogIn className="h-3.5 w-3.5" /> Registrar chegada do veículo
                    </Button>
                    <span className="text-[10px] text-muted-foreground text-right">
                      Pré-preenche com dados previstos da carga
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {grupoDialog && prefill && (
        <RegistroEntradaDialog
          open={!!grupoDialog}
          onOpenChange={(o) => { if (!o) { setGrupoDialog(null); setPrefill(null); } }}
          grupo={grupoDialog}
          prefill={{
            placa: prefill.placa || "",
            motorista: prefill.motorista || "",
            transportadora: prefill.transportadora || undefined,
            tipo_veiculo: prefill.tipo_caminhao || undefined,
            carga_id: prefill.carga_id,
          }}
        />
      )}
    </>
  );
}
