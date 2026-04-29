import { Card, CardContent } from "@/components/ui/card";
import { ParkingCircle, BellRing, Clock3, Package, TruckIcon, PackageCheck, Scale } from "lucide-react";

interface Props {
  noPatio: number;
  chegou: number;
  aChegar: number;
  cargasFechadas: number;
  kgCarregado: number;
  kgACarregar: number;
  kgTotal: number;
}

const fmtKg = (n: number) =>
  `${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`;

const opItems = [
  { key: "noPatio" as const, label: "No pátio", icon: ParkingCircle },
  { key: "chegou" as const, label: "Chegou — aguardando", icon: BellRing },
  { key: "aChegar" as const, label: "A chegar", icon: Clock3 },
  { key: "cargasFechadas" as const, label: "Cargas prontas", icon: Package },
];

const kgItems = [
  { key: "kgCarregado" as const, label: "Carregado / em carregamento", icon: TruckIcon },
  { key: "kgACarregar" as const, label: "A carregar", icon: PackageCheck },
  { key: "kgTotal" as const, label: "Total previsto do dia", icon: Scale, highlight: true },
];

export function ExpedicaoKpiCards(props: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {opItems.map((it) => {
          const Icon = it.icon;
          const value = props[it.key];
          return (
            <Card key={it.key} className="overflow-hidden border-sidebar/30 shadow-sm">
              <CardContent className="p-0 bg-sidebar text-sidebar-foreground">
                <div className="p-4 flex items-center gap-3">
                  <div className="shrink-0 rounded-lg bg-white/15 p-2">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-90 truncate">{it.label}</p>
                    <p className="text-3xl xl:text-4xl font-extrabold leading-none mt-1 tabular-nums">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
        {kgItems.map((it) => {
          const Icon = it.icon;
          const value = props[it.key];
          const isHighlight = it.highlight;
          return (
            <Card
              key={it.key}
              className={`overflow-hidden shadow-sm ${
                isHighlight ? "border-sidebar" : "border-sidebar/30"
              }`}
            >
              <CardContent
                className={`p-0 ${
                  isHighlight
                    ? "bg-sidebar text-sidebar-foreground"
                    : "bg-card text-card-foreground border-l-4 border-l-sidebar"
                }`}
              >
                <div className="p-4 flex items-center gap-3">
                  <div
                    className={`shrink-0 rounded-lg p-2 ${
                      isHighlight ? "bg-white/15" : "bg-sidebar/10 text-sidebar"
                    }`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide truncate ${
                        isHighlight ? "opacity-90" : "text-muted-foreground"
                      }`}
                    >
                      {it.label}
                    </p>
                    <p className="text-3xl xl:text-4xl font-extrabold leading-none mt-1 tabular-nums">
                      {fmtKg(value)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
