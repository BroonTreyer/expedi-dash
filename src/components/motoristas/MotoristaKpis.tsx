import { Card, CardContent } from "@/components/ui/card";
import { Users, Route, Clock, Weight, Package, Activity } from "lucide-react";
import { formatDuracao } from "@/lib/portaria-tempos";
import type { MotoristaAgg } from "@/hooks/useMotoristasPainel";

const fmtKm = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km";
const fmtTon = (kg: number) => (kg / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " t";

export function MotoristaKpis({ data }: { data: MotoristaAgg[] }) {
  const ativos = data.length;
  const km_total = data.reduce((a, b) => a + b.km_total, 0);
  const tempos = data.map((d) => d.tempo_medio_min).filter((n): n is number => n != null);
  const tempo_medio = tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null;
  const peso_total = data.reduce((a, b) => a + b.peso_total, 0);
  const entregas = data.reduce((a, b) => a + b.entregas_total, 0);
  const em_rota = data.filter((d) => d.em_rota).length;

  const items = [
    { icon: Users, label: "Motoristas ativos", value: String(ativos) },
    { icon: Route, label: "KM total", value: fmtKm(km_total) },
    { icon: Clock, label: "Tempo médio de rota", value: formatDuracao(tempo_medio ?? undefined) },
    { icon: Weight, label: "Peso transportado", value: fmtTon(peso_total) },
    { icon: Package, label: "Entregas", value: entregas.toLocaleString("pt-BR") },
    { icon: Activity, label: "Em rota agora", value: String(em_rota) },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted">
              <it.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">{it.label}</p>
              <p className="text-base font-semibold truncate">{it.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
