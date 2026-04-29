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
  { key: "noPatio" as const, label: "No pátio", icon: ParkingCircle, bg: "bg-emerald-600", ring: "ring-emerald-500/30" },
  { key: "chegou" as const, label: "Chegou — aguardando", icon: BellRing, bg: "bg-amber-500", ring: "ring-amber-400/30", textOnBg: "text-black" },
  { key: "aChegar" as const, label: "A chegar", icon: Clock3, bg: "bg-sky-600", ring: "ring-sky-500/30" },
  { key: "cargasFechadas" as const, label: "Cargas prontas", icon: Package, bg: "bg-indigo-600", ring: "ring-indigo-500/30" },
];

const kgItems = [
  { key: "kgCarregado" as const, label: "Carregado / em carregamento", icon: TruckIcon, bg: "bg-emerald-700", ring: "ring-emerald-600/30" },
  { key: "kgACarregar" as const, label: "A carregar", icon: PackageCheck, bg: "bg-orange-600", ring: "ring-orange-500/30" },
  { key: "kgTotal" as const, label: "Total previsto do dia", icon: Scale, bg: "bg-violet-600", ring: "ring-violet-500/30" },
];

export function ExpedicaoKpiCards(props: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {opItems.map((it) => {
          const Icon = it.icon;
          const value = props[it.key];
          const txt = it.textOnBg ?? "text-white";
          return (
            <Card key={it.key} className={`overflow-hidden border-0 ring-1 ${it.ring} shadow-md`}>
              <CardContent className={`p-0 ${it.bg} ${txt}`}>
                <div className="p-4 flex items-center gap-3">
                  <div className={`shrink-0 rounded-lg bg-black/15 p-2`}>
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
          return (
            <Card key={it.key} className={`overflow-hidden border-0 ring-1 ${it.ring} shadow-md`}>
              <CardContent className={`p-0 ${it.bg} text-white`}>
                <div className="p-4 flex items-center gap-3">
                  <div className="shrink-0 rounded-lg bg-black/20 p-2">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-90 truncate">{it.label}</p>
                    <p className="text-3xl xl:text-4xl font-extrabold leading-none mt-1 tabular-nums">{fmtKg(value)}</p>
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
