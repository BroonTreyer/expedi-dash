import React from "react";
import { Package, Weight, Truck, CheckCircle, ClipboardList, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Carregamento } from "@/hooks/useCarregamentos";

interface Props {
  data: Carregamento[];
  selectedData?: Carregamento[];
}

export const KpiCards = React.memo(function KpiCards({ data, selectedData }: Props) {
  const source = selectedData ?? data;
  const totalClientes = new Set(source.filter(c => c.codigo_cliente).map(c => c.codigo_cliente)).size;
  const pesoTotal = source.reduce((s, c) => s + (c.peso ?? 0), 0);
  const pesoCarregado = source.filter(c => c.status === "Carregado").reduce((s, c) => s + (c.peso ?? 0), 0);
  const pesoCarregando = source.filter(c => c.status === "Carregando").reduce((s, c) => s + (c.peso ?? 0), 0);
  const totalVeiculos = new Set(source.filter(c => c.placa).map(c => c.placa)).size;
  const pendentesLogistica = new Set(source.filter(c => c.etapa === "vendas" && c.numero_pedido).map(c => c.numero_pedido)).size;
  // Rupturas por pedido único
  const totalPedidosUnicos = new Set(source.filter(c => c.numero_pedido).map(c => c.numero_pedido)).size;
  const pedidosComRuptura = new Set(source.filter(c => c.ruptura && c.numero_pedido).map(c => c.numero_pedido)).size;
  const rupturas = pedidosComRuptura;

  const cards = [
    { label: selectedData ? "Clientes (sel.)" : "Clientes", value: totalClientes, icon: Package, color: "text-primary", tooltip: "Quantidade de clientes distintos nos pedidos" },
    { label: "Pend. Logística", value: pendentesLogistica, icon: ClipboardList, color: "text-amber-500", tooltip: "Pedidos na etapa de vendas aguardando logística" },
    { label: "Rupturas", value: rupturas, icon: AlertTriangle, color: "text-amber-600", tooltip: `${pedidosComRuptura} de ${totalPedidosUnicos} pedidos únicos com ao menos 1 produto em ruptura` },
    { label: selectedData ? "Peso Sel." : "Peso Total", value: `${pesoTotal.toLocaleString("pt-BR")} kg`, icon: Weight, color: "text-foreground", tooltip: "Soma do peso de todos os pedidos exibidos" },
    { label: "Peso Carregado", value: `${pesoCarregado.toLocaleString("pt-BR")} kg`, icon: CheckCircle, color: "text-status-carregado", tooltip: "Peso dos pedidos com status 'Carregado'" },
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
