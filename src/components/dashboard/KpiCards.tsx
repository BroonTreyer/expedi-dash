import React from "react";
import { Package, Weight, Truck, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Carregamento } from "@/hooks/useCarregamentos";
import { isRupturaParcial, pesoNaoCarregado } from "@/lib/peso-utils";
import { temRuptura } from "@/lib/ruptura-utils";

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
  const pesoFaltante = Math.max(0, pesoTotal - pesoCarregado - pesoCarregando);
  const totalVeiculos = new Set(source.filter(c => c.placa).map(c => c.placa)).size;
  // Rupturas por pedido único
  const totalPedidosUnicos = new Set(source.filter(c => c.numero_pedido).map(c => c.numero_pedido)).size;
  const pedidosComRuptura = new Set(source.filter(c => temRuptura(c) && c.numero_pedido).map(c => c.numero_pedido)).size;
  const pedidosComParcial = new Set(
    source.filter(c => isRupturaParcial(c) && c.numero_pedido && !temRuptura(c)).map(c => c.numero_pedido),
  ).size;
  const rupturas = pedidosComRuptura + pedidosComParcial;
  const pesoNaoCarregadoTotal = source.reduce((s, c) => s + pesoNaoCarregado(c), 0);
  const itensComRuptura = source.filter(c => temRuptura(c) || isRupturaParcial(c)).length;
  const rupturaLabel = pedidosComParcial > 0
    ? `${pedidosComRuptura} totais + ${pedidosComParcial} parciais`
    : `${pedidosComRuptura}`;
  const rupturaTooltip = `${rupturas} pedido(s) afetado(s) (${pedidosComRuptura} total(is) + ${pedidosComParcial} parcial(is)) em ${totalPedidosUnicos} pedido(s) único(s) — ${itensComRuptura} item(ns) de produto em ruptura. ${pesoNaoCarregadoTotal.toLocaleString("pt-BR")} kg não carregados.`;

  const cards: Array<{ label: string; value: string | number; sub?: string; icon: any; color: string; tooltip: string }> = [
    { label: selectedData ? "Clientes (sel.)" : "Clientes", value: totalClientes, icon: Package, color: "text-primary", tooltip: "Quantidade de clientes distintos nos pedidos" },
    {
      label: "Rupturas",
      value: rupturaLabel,
      sub: pesoNaoCarregadoTotal > 0 ? `${pesoNaoCarregadoTotal.toLocaleString("pt-BR")} kg perdidos` : undefined,
      icon: AlertTriangle,
      color: "text-amber-600",
      tooltip: rupturaTooltip,
    },
    {
      label: selectedData ? "Peso Sel." : "Peso Total",
      value: `${pesoTotal.toLocaleString("pt-BR")} kg`,
      sub: pesoFaltante > 0 ? `${pesoFaltante.toLocaleString("pt-BR")} kg a carregar` : undefined,
      icon: Weight,
      color: "text-foreground",
      tooltip: `Soma do peso planejado (pedido). Faltam ${pesoFaltante.toLocaleString("pt-BR")} kg a carregar (status Aguardando, descontando rupturas).`,
    },
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
                  {c.sub && (
                    <span className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-400 font-medium truncate -mt-0.5">{c.sub}</span>
                  )}
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
