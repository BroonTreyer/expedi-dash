import { Package, Weight, Truck, Clock, CheckCircle, AlertTriangle, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Carregamento } from "@/hooks/useCarregamentos";

interface Props {
  data: Carregamento[];
}

export function KpiCards({ data }: Props) {
  const totalCargas = data.length;
  const pesoTotal = data.reduce((s, c) => s + (c.peso ?? 0), 0);
  const pesoCarregado = data.filter(c => c.status === "Carregado").reduce((s, c) => s + (c.peso ?? 0), 0);
  const pesoCarregando = data.filter(c => c.status === "Carregando").reduce((s, c) => s + (c.peso ?? 0), 0);
  const pesoPendente = pesoTotal - pesoCarregado - pesoCarregando;
  const totalVeiculos = new Set(data.filter(c => c.placa).map(c => c.placa)).size;
  const pendentesLogistica = data.filter(c => c.etapa === "vendas").length;

  const cards = [
    { label: "Total Cargas", value: totalCargas, icon: Package, color: "text-primary" },
    { label: "Pendentes Logística", value: pendentesLogistica, icon: ClipboardList, color: "text-amber-500" },
    { label: "Peso Total", value: `${pesoTotal.toLocaleString("pt-BR")} kg`, icon: Weight, color: "text-foreground" },
    { label: "Peso Carregado", value: `${pesoCarregado.toLocaleString("pt-BR")} kg`, icon: CheckCircle, color: "text-status-carregado" },
    { label: "Em Carregamento", value: `${pesoCarregando.toLocaleString("pt-BR")} kg`, icon: Clock, color: "text-status-carregando" },
    { label: "Veículos", value: totalVeiculos, icon: Truck, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <span className="text-xl font-bold tracking-tight">{c.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
