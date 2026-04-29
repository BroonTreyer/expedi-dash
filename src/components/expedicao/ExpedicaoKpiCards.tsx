import { Card, CardContent } from "@/components/ui/card";
import { ParkingCircle, BellRing, Clock3, Package } from "lucide-react";

interface Props {
  noPatio: number;
  chegou: number;
  aChegar: number;
  cargasFechadas: number;
}

const items = [
  { key: "noPatio", label: "No pátio", icon: ParkingCircle, accent: "text-emerald-600 dark:text-emerald-400" },
  { key: "chegou", label: "Chegou — aguardando", icon: BellRing, accent: "text-amber-600 dark:text-amber-400" },
  { key: "aChegar", label: "A chegar", icon: Clock3, accent: "text-sky-600 dark:text-sky-400" },
  { key: "cargasFechadas", label: "Cargas prontas", icon: Package, accent: "text-blue-600 dark:text-blue-400" },
] as const;

export function ExpedicaoKpiCards(props: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        const value = props[it.key];
        return (
          <Card key={it.key}>
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className={`shrink-0 ${it.accent}`}>
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{it.label}</p>
                <p className="text-xl sm:text-2xl font-bold leading-tight">{value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
