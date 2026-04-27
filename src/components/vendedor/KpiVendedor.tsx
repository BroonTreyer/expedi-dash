import { Card, CardContent } from "@/components/ui/card";
import { Package, Weight, TrendingUp, AlertTriangle } from "lucide-react";

interface Props {
  carregamentos: any[];
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function KpiVendedor({ carregamentos }: Props) {
  // Pedidos únicos = (data + numero_pedido)
  const pedidoSet = new Set<string>();
  let pesoTotal = 0;
  let rupturas = 0;

  for (const c of carregamentos) {
    if (c.numero_pedido != null) pedidoSet.add(`${c.data}-${c.numero_pedido}`);
    pesoTotal += Number(c.peso ?? 0);
    if (c.ruptura || c.ruptura_sinalizada) rupturas++;
  }

  const pedidos = pedidoSet.size;
  const ticketMedio = pedidos > 0 ? pesoTotal / pedidos : 0;
  const pctRuptura = carregamentos.length > 0 ? (rupturas / carregamentos.length) * 100 : 0;

  const cards = [
    { label: "Pedidos", value: fmt(pedidos), icon: Package, hint: "no período" },
    { label: "Peso expedido", value: `${fmt(pesoTotal)} kg`, icon: Weight, hint: "soma total" },
    { label: "Ticket médio", value: `${fmt(ticketMedio)} kg`, icon: TrendingUp, hint: "por pedido" },
    { label: "Rupturas", value: `${pctRuptura.toFixed(1)}%`, icon: AlertTriangle, hint: `${rupturas} itens`, ruptura: true },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className={c.ruptura && rupturas > 0 ? "border-[#EF5350]/40" : ""}>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <Icon className={`h-4 w-4 ${c.ruptura && rupturas > 0 ? "text-[#EF5350]" : "text-muted-foreground"}`} />
              </div>
              <p className={`text-2xl font-bold tracking-tight ${c.ruptura && rupturas > 0 ? "text-[#EF5350]" : ""}`}>{c.value}</p>
              <p className="text-[11px] text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}