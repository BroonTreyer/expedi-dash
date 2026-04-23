import React from "react";
import { Package, Weight, Truck, CheckCircle, ClipboardList, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Carregamento } from "@/hooks/useCarregamentos";
import { isRupturaParcial, pesoNaoCarregado } from "@/lib/peso-utils";

interface Props {
  data: Carregamento[];
  selectedData?: Carregamento[];
}

export const KpiCards = React.memo(function KpiCards({ data, selectedData }: Props) {
  const source = selectedData ?? data;
  const totalClientes = new Set(source.filter(c => c.codigo_cliente).map(c => c.codigo_cliente)).size;
  const pesoTotal = source.reduce((s, c) => s + (c.peso ?? 0), 0);
  // Peso efetivo: ignora itens em ruptura (não foram fisicamente carregados).
  const pesoCarregado = source
    .filter(c => c.status === "Carregado" && !c.ruptura)
    .reduce((s, c) => s + (c.peso ?? 0), 0);
  const pesoCarregando = source
    .filter(c => c.status === "Carregando" && !c.ruptura)
    .reduce((s, c) => s + (c.peso ?? 0), 0);
  const totalVeiculos = new Set(source.filter(c => c.placa).map(c => c.placa)).size;
  const pendentesLogistica = new Set(source.filter(c => c.etapa === "vendas" && c.numero_pedido).map(c => c.numero_pedido)).size;
  // Rupturas por pedido único
  const totalPedidosUnicos = new Set(source.filter(c => c.numero_pedido).map(c => c.numero_pedido)).size;
  const pedidosComRuptura = new Set(source.filter(c => c.ruptura && c.numero_pedido).map(c => c.numero_pedido)).size;
  const pedidosComParcial = new Set(
    source.filter(c => isRupturaParcial(c) && c.numero_pedido && !c.ruptura).map(c => c.numero_pedido),
  ).size;
  const rupturas = pedidosComRuptura + pedidosComParcial;
  const pesoNaoCarregadoTotal = source.reduce((s, c) => s + pesoNaoCarregado(c), 0);
  const rupturaLabel = pedidosComParcial > 0
    ? `${pedidosComRuptura} totais + ${pedidosComParcial} parciais`
    : `${pedidosComRuptura}`;
  const rupturaTooltip = `${pedidosComRuptura} ruptura(s) total(is) + ${pedidosComParcial} parcial(is) em ${totalPedidosUnicos} pedido(s) único(s). ${pesoNaoCarregadoTotal.toLocaleString("pt-BR")} kg não carregados.`;

  const cards = [
    { label: selectedData ? "Clientes (sel.)" : "Clientes", value: totalClientes, icon: Package, color: "text-primary", tooltip: "Quantidade de clientes distintos nos pedidos" },
    { label: "Pend. Logística", value: pendentesLogistica, icon: ClipboardList, color: "text-amber-500", tooltip: "Pedidos na etapa de vendas aguardando logística" },
    {
      label: "Rupturas",
      value: rupturaLabel,
      sub: pesoNaoCarregadoTotal > 0 ? `${pesoNaoCarregadoTotal.toLocaleString("pt-BR")} kg perdidos` : undefined,
      icon: AlertTriangle,
      color: "text-amber-600",
      tooltip: rupturaTooltip,
    },
    { label: selectedData ? "Peso Sel." : "Peso Total", value: `${pesoTotal.toLocaleString("pt-BR")} kg`, icon: Weight, color: "text-foreground", tooltip: "Soma do peso planejado (pedido). Para o peso fisicamente embarcado, veja 'Peso Carregado'." },
    { label: "Peso Carregado", value: `${pesoCarregado.toLocaleString("pt-BR")} kg`, icon: CheckCircle, color: "text-status-carregado", tooltip: "Peso efetivo embarcado nos status 'Carregado' (desconsidera itens em ruptura)." },
    { label: "Veículos", value: totalVeiculos, icon: Truck, color: "text-primary", tooltip: "Quantidade de veículos (placas) distintos" },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
        {cards.map((c) => (
          <Tooltip key={c.label}>
            <TooltipTrigger asChild>
              <Card className={selectedData ? "border-primary/40 cursor-help" : "border-border/60 cursor-help"}>
                <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">{c.label}</span>
                    <c.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${c.color}`} />
                  </div>
                  <span className="text-base sm:text-xl font-bold tracking-tight truncate">{c.value}</span>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{c.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
});
