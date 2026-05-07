import { useState, useMemo, forwardRef } from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Weight, Package, AlertTriangle, TrendingUp, Calendar, BarChart3,
  Download, ArrowUpRight, ArrowDownRight, Minus, Eye, Truck, Users, MapPin,
  Filter, CheckCircle2, Clock, Loader2, AlertCircle,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from "recharts";
import { useAnalytics, type AnalyticsFilters } from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRotasExecutadas } from "@/hooks/useRotasExecutadas";

// ── Period options ──
const PERIOD_OPTIONS = [
  { value: "hoje", label: "Hoje" },
  { value: "ontem", label: "Ontem" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "15d", label: "Últimos 15 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "mes_atual", label: "Mês atual" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "90d", label: "Últimos 90 dias" },
];

// ── Clean solid palette ──
const BRAND_RED = "#D42027";
const NAVY = "#1E40AF";
const EMERALD = "#059669";
const SLATE_SOLID = "#64748B";

const CHART_COLORS = [
  "#1E40AF",  // Navy
  "#059669",  // Emerald
  "#D97706",  // Amber
  "#64748B",  // Slate
  "#7C3AED",  // Violet
  "#0891B2",  // Cyan
  "#D42027",  // Red
  "#0369A1",  // Sky
];

const STATUS_ICONS: Record<string, any> = {
  "Aguardando": Clock,
  "Carregando": Loader2,
  "Carregado": CheckCircle2,
};

const STATUS_COLORS_MAP: Record<string, string> = {
  "Aguardando": "text-amber-500",
  "Carregando": "text-blue-500",
  "Carregado": "text-emerald-600",
};

const STATUS_BG_MAP: Record<string, string> = {
  "Aguardando": "bg-amber-500/10",
  "Carregando": "bg-blue-500/10",
  "Carregado": "bg-emerald-600/10",
};

const STATUS_PROGRESS_COLOR: Record<string, string> = {
  "Aguardando": "bg-amber-500",
  "Carregando": "bg-blue-500",
  "Carregado": "bg-emerald-500",
};

function getDateRange(period: string) {
  const today = new Date();
  switch (period) {
    case "hoje": return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "ontem": {
      const y = subDays(today, 1);
      return { from: format(y, "yyyy-MM-dd"), to: format(y, "yyyy-MM-dd") };
    }
    case "7d": return { from: format(subDays(today, 7), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "15d": return { from: format(subDays(today, 15), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "30d": return { from: format(subDays(today, 30), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "mes_atual": return { from: format(startOfMonth(today), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "mes_anterior": {
      const prev = subMonths(today, 1);
      return { from: format(startOfMonth(prev), "yyyy-MM-dd"), to: format(endOfMonth(prev), "yyyy-MM-dd") };
    }
    case "90d": return { from: format(subDays(today, 90), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    default: return { from: format(subDays(today, 30), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
  }
}

function fmtDate(dateStr: string) {
  try { return format(new Date(dateStr + "T12:00:00"), "dd/MM", { locale: ptBR }); }
  catch { return dateStr; }
}

function fmtKg(v: number) { return `${v.toLocaleString("pt-BR")} kg`; }
function fmtTon(v: number) { return `${(v / 1000).toFixed(1)}t`; }
function fmtYAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}t`;
  return `${v}`;
}

function exportCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const fmtCell = (v: string | number) => {
    if (typeof v === "number") return v.toLocaleString("pt-BR");
    // Escape valores com ponto-e-vírgula ou aspas
    if (/[;"\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  const csv = [headers.join(";"), ...rows.map((r) => r.map(fmtCell).join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Variation badge ──
const VarBadge = forwardRef<HTMLSpanElement, { value: number | null }>(({ value }, ref) => {
  if (value === null) return <span ref={ref} className="text-[10px] text-muted-foreground">—</span>;
  const isUp = value > 0;
  const isZero = value === 0;
  return (
    <span ref={ref} className={cn(
      "inline-flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5",
      isZero ? "text-muted-foreground bg-muted" : isUp ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
    )}>
      {isZero ? <Minus className="h-2.5 w-2.5" /> : isUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {Math.abs(value)}%
    </span>
  );
});
VarBadge.displayName = "VarBadge";

// ── KPI Card ──
const KpiCard = forwardRef<HTMLDivElement, {
  label: string; value: string; icon: any; variation: number | null; loading: boolean; accent?: string; subtitle?: string;
}>(({ label, value, icon: Icon, variation, loading, accent, subtitle }, ref) => {
  if (loading) return (
    <Card ref={ref} className="border-border/40">
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-28" />
      </CardContent>
    </Card>
  );
  return (
    <Card ref={ref} className="border-border/40 hover:shadow-md transition-all duration-300 group">
      <CardContent className="p-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground tracking-wide">{label}</span>
          <div className={cn("p-1.5 rounded-lg transition-colors", accent || "bg-muted")}>
            <Icon className="h-3.5 w-3.5 text-foreground/70" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg sm:text-xl font-bold tracking-tight">{value}</span>
          <VarBadge value={variation} />
        </div>
        {subtitle && (
          <span className="text-[10px] text-muted-foreground leading-tight">{subtitle}</span>
        )}
      </CardContent>
    </Card>
  );
});
KpiCard.displayName = "KpiCard";

// ── Rich Tooltip ──
function RichTooltip({ active, payload, label, suffix = "kg", formatLabel }: any) {
  if (!active || !payload?.length) return null;
  const displayLabel = formatLabel ? formatLabel(label) : fmtDate(label);
  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border/60 rounded-lg shadow-2xl p-3 text-xs min-w-[170px]">
      <p className="font-semibold text-foreground mb-2 pb-1.5 border-b border-border/40 text-[11px]">{displayLabel}</p>
      <div className="space-y-1.5">
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-muted-foreground text-[11px]">{p.name}</span>
            </div>
            <span className="font-bold text-foreground tabular-nums text-[11px]">
              {typeof p.value === "number" ? p.value.toLocaleString("pt-BR") : p.value}
              {suffix && <span className="text-muted-foreground font-normal ml-0.5">{suffix}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty state ──
function EmptyState({ message = "Sem dados para o período selecionado" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-16">
      <BarChart3 className="h-10 w-10 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Filter Popover ──
function FilterPopover({ filterOptions, filterVendedores, filterTipos, filterUfs, setFilterVendedores, setFilterTipos, setFilterUfs }: {
  filterOptions: { uniqueVendedores: string[]; uniqueTipos: string[]; uniqueUfs: string[] } | undefined;
  filterVendedores: string[]; filterTipos: string[]; filterUfs: string[];
  setFilterVendedores: (v: string[]) => void; setFilterTipos: (v: string[]) => void; setFilterUfs: (v: string[]) => void;
}) {
  const totalActive = filterVendedores.length + filterTipos.length + filterUfs.length;
  if (!filterOptions) return null;

  const sections = [
    { label: "Vendedor", options: filterOptions.uniqueVendedores, selected: filterVendedores, onChange: setFilterVendedores },
    { label: "Tipo Veículo", options: filterOptions.uniqueTipos, selected: filterTipos, onChange: setFilterTipos },
    { label: "Estado (UF)", options: filterOptions.uniqueUfs, selected: filterUfs, onChange: setFilterUfs },
  ].filter((s) => s.options.length > 1);

  if (sections.length === 0) return null;

  const clearAll = () => { setFilterVendedores([]); setFilterTipos([]); setFilterUfs([]); };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {totalActive > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {totalActive}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <div className="p-3 border-b border-border/40 flex items-center justify-between">
            <span className="text-xs font-semibold">Filtros</span>
            {totalActive > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground" onClick={clearAll}>
                Limpar todos
              </Button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/30">
            {sections.map((section) => (
              <div key={section.label} className="p-3 space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{section.label}</span>
                <div className="space-y-1">
                  {section.options.slice(0, 15).map((opt) => (
                    <label key={opt} className="flex items-center gap-2 px-1.5 py-1 text-xs rounded cursor-pointer hover:bg-accent/50 transition-colors">
                      <Checkbox
                        checked={section.selected.includes(opt)}
                        onCheckedChange={() => {
                          section.onChange(
                            section.selected.includes(opt)
                              ? section.selected.filter((v) => v !== opt)
                              : [...section.selected, opt]
                          );
                        }}
                      />
                      <span className="truncate">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {totalActive > 0 && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearAll}>
          Limpar
        </Button>
      )}
    </div>
  );
}

// ── Status Mini Cards ──
const StatusMiniCards = forwardRef<HTMLDivElement, { data: { status: string; count: number; peso: number }[] }>(({ data }, ref) => {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div ref={ref} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {data.map((d) => {
        const Icon = STATUS_ICONS[d.status] || Package;
        const color = STATUS_COLORS_MAP[d.status] || "text-muted-foreground";
        const bg = STATUS_BG_MAP[d.status] || "bg-muted/50";
        const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
        return (
          <div key={d.status} className={cn("rounded-lg p-4 flex items-center gap-3 border border-border/30", bg)}>
            <div className={cn("p-2 rounded-lg bg-background/80 shadow-sm")}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">{d.status}</p>
              <p className="text-lg font-bold tabular-nums">{d.count}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 flex-1 rounded-full bg-muted/50 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", STATUS_PROGRESS_COLOR[d.status] || "bg-slate-400")} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
StatusMiniCards.displayName = "StatusMiniCards";

// ── Vendor Ranking with Progress Bars ──
function VendorRanking({ data, maxPeso }: { data: { nome: string; peso: number; participacao: number; pedidos: number }[]; maxPeso: number }) {
  return (
    <div className="space-y-2.5">
      {data.slice(0, 10).map((v, i) => {
        const pct = maxPeso > 0 ? (v.peso / maxPeso) * 100 : 0;
        const opacity = Math.max(0.3, 1 - i * 0.07);
        return (
          <div key={v.nome} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-muted-foreground w-5 text-right tabular-nums">{i + 1}.</span>
                <span className="text-xs font-medium truncate">{v.nome}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] text-muted-foreground tabular-nums">{v.participacao}%</span>
                <span className="text-xs font-bold tabular-nums">{fmtTon(v.peso)}</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: NAVY,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared axis config ──
const AXIS_STYLE = { fill: "hsl(var(--muted-foreground))", fontSize: 10 };
const GRID_STYLE = "stroke-border/30";

// ── Chart card wrapper ──
function ChartCard({ title, subtitle, children, headerAction, className }: {
  title: string; subtitle?: string; children: React.ReactNode; headerAction?: React.ReactNode; className?: string;
}) {
  return (
    <Card className={cn("border-border/40", className)}>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {subtitle && <CardDescription className="text-[11px] mt-0.5">{subtitle}</CardDescription>}
        </div>
        {headerAction}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ── Table with inline progress bars ──
function PremiumTableRow({ cells, progressValue, maxProgress }: {
  cells: (string | number)[]; progressValue?: number; maxProgress?: number;
}) {
  const pct = progressValue && maxProgress ? (progressValue / maxProgress) * 100 : 0;
  return (
    <TableRow className="hover:bg-muted/30 transition-colors">
      {cells.map((cell, i) => (
        <TableCell key={i} className={cn(i === 0 ? "font-medium" : "text-right tabular-nums", "py-2.5")}>
          {i === 1 && progressValue ? (
            <div className="flex items-center gap-2 justify-end">
                <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden hidden sm:block">
                <div className="h-full rounded-full bg-slate-400/60" style={{ width: `${pct}%` }} />
              </div>
              <span>{typeof cell === "number" ? cell.toLocaleString("pt-BR") : cell}</span>
            </div>
          ) : (
            <>{typeof cell === "number" ? cell.toLocaleString("pt-BR") : cell}{typeof cell === "number" ? "" : ""}</>
          )}
        </TableCell>
      ))}
    </TableRow>
  );
}

// ══════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════
export default function Analytics() {
  const [period, setPeriod] = useState("30d");
  const [filterVendedores, setFilterVendedores] = useState<string[]>([]);
  const [filterTipos, setFilterTipos] = useState<string[]>([]);
  const [filterUfs, setFilterUfs] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const yAxisCatWidth = isMobile ? 70 : 120;
  const yAxisCatFontSize = isMobile ? 8 : 9;

  const range = useMemo(() => getDateRange(period), [period]);
  const periodDays = useMemo(() => differenceInDays(new Date(range.to), new Date(range.from)), [range]);
  const manyDays = periodDays > 15;

  const filters: AnalyticsFilters = useMemo(() => ({
    dateFrom: range.from,
    dateTo: range.to,
    vendedores: filterVendedores.length ? filterVendedores : undefined,
    tipoCaminhao: filterTipos.length ? filterTipos : undefined,
    ufs: filterUfs.length ? filterUfs : undefined,
  }), [range, filterVendedores, filterTipos, filterUfs]);

  const { analytics, isLoading } = useAnalytics(filters);
  const a = analytics;

  const kpis = a?.kpis ?? {
    totalPeso: 0, totalPedidos: 0, totalRupturas: 0, totalCarregado: 0,
    diasUnicos: 0, diasPeriodo: 0, mediaDiaria: 0, taxaRuptura: 0,
    totalPedidosUnicos: 0, pedidosComRuptura: 0,
    varPeso: null, varPedidos: null, varRupturas: null,
    varCarregado: null, varMediaDiaria: null, varTaxaRuptura: null,
  };

  const hasData = (a?.dailyWeight?.length ?? 0) > 0;
  const xTickProps = manyDays ? { angle: -45, textAnchor: "end" as const, ...AXIS_STYLE } : AXIS_STYLE;
  const xAxisHeight = manyDays ? 50 : 30;

  const kpiCards = [
    { label: "Peso Total", value: fmtKg(kpis.totalPeso), icon: Weight, variation: kpis.varPeso, accent: "bg-primary/10", subtitle: "exclui Pendente/Cancelado" },
    { label: "Total Pedidos", value: kpis.totalPedidos.toLocaleString("pt-BR"), icon: Package, variation: kpis.varPedidos, accent: "bg-blue-500/10", subtitle: "pedidos únicos" },
    { label: "Peso Carregado", value: fmtKg(kpis.totalCarregado), icon: CheckCircle2, variation: kpis.varCarregado, accent: "bg-emerald-500/10" },
    { label: "Média Diária", value: fmtKg(kpis.mediaDiaria), icon: TrendingUp, variation: kpis.varMediaDiaria, accent: "bg-violet-500/10", subtitle: `sobre ${kpis.diasPeriodo ?? 0} dias do período` },
    { label: "Taxa Ruptura", value: `${kpis.taxaRuptura}%`, icon: AlertTriangle, variation: kpis.varTaxaRuptura, accent: "bg-amber-500/10", subtitle: `${kpis.pedidosComRuptura ?? 0} de ${kpis.totalPedidosUnicos ?? 0} pedidos` },
    { label: "Dias com Movim.", value: `${kpis.diasUnicos}/${kpis.diasPeriodo ?? 0}`, icon: Calendar, variation: null, accent: "bg-slate-500/10", subtitle: "ativos / totais" },
  ];

  const maxVendPeso = a?.vendedorRanking?.[0]?.peso ?? 1;
  const maxTipoPeso = a?.tipoCaminhaoBreakdown?.[0]?.peso ?? 1;
  const maxUfPeso = a?.ufDistribution?.[0]?.peso ?? 1;

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-xs text-muted-foreground">Painel gerencial de expedição — visão comparativa com período anterior</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant={period === "hoje" ? "default" : "outline"}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setPeriod("hoje")}
              >
                Hoje
              </Button>
              <Button
                variant={period === "ontem" ? "default" : "outline"}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setPeriod("ontem")}
              >
                Ontem
              </Button>
            </div>
            <FilterPopover
              filterOptions={a?.filterOptions}
              filterVendedores={filterVendedores}
              filterTipos={filterTipos}
              filterUfs={filterUfs}
              setFilterVendedores={setFilterVendedores}
              setFilterTipos={setFilterTipos}
              setFilterUfs={setFilterUfs}
            />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-44 h-8 text-xs min-w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
          {kpiCards.map((c) => (
            <KpiCard key={c.label} {...c} loading={isLoading} />
          ))}
        </div>

        {a?.truncated && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Resultado limitado a 20.000 registros — refine o período para garantir números completos.</span>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="visao" className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-muted/40 border border-border/30 inline-flex w-max sm:w-auto">
              <TabsTrigger value="visao" className="gap-1.5 text-xs data-[state=active]:shadow-sm whitespace-nowrap"><Eye className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Visão Geral</span><span className="sm:hidden">Visão</span></TabsTrigger>
              <TabsTrigger value="expedicao" className="gap-1.5 text-xs data-[state=active]:shadow-sm whitespace-nowrap"><Truck className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Expedição</span><span className="sm:hidden">Exped.</span></TabsTrigger>
              <TabsTrigger value="vendedores" className="gap-1.5 text-xs data-[state=active]:shadow-sm whitespace-nowrap"><Users className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Vendedores</span><span className="sm:hidden">Vend.</span></TabsTrigger>
              <TabsTrigger value="rupturas" className="gap-1.5 text-xs data-[state=active]:shadow-sm whitespace-nowrap"><AlertTriangle className="h-3.5 w-3.5" /> Rupturas</TabsTrigger>
              <TabsTrigger value="geografia" className="gap-1.5 text-xs data-[state=active]:shadow-sm whitespace-nowrap"><MapPin className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Geografia</span><span className="sm:hidden">Geo.</span></TabsTrigger>
              <TabsTrigger value="rotas" className="gap-1.5 text-xs data-[state=active]:shadow-sm whitespace-nowrap"><Truck className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Histórico de Rotas</span><span className="sm:hidden">Rotas</span></TabsTrigger>
            </TabsList>
          </div>

          {/* ═══════ TAB: VISÃO GERAL ═══════ */}
          <TabsContent value="visao">
            {!hasData && !isLoading ? <EmptyState /> : (
              <div className="space-y-4">
                {/* Status mini cards */}
                {a?.statusBreakdown && a.statusBreakdown.length > 0 && (
                  <StatusMiniCards data={a.statusBreakdown} />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Peso acumulado */}
                  <ChartCard title="Peso Acumulado" subtitle="Evolução cumulativa do peso total expedido no período">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={a?.dailyWeight ?? []} margin={{ top: 5, right: 10, left: 0, bottom: xAxisHeight - 25 }}>
                          <defs>
                            <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={BRAND_RED} stopOpacity={0.2} />
                              <stop offset="100%" stopColor={BRAND_RED} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} vertical={false} />
                          <XAxis dataKey="date" tickFormatter={fmtDate} tick={xTickProps} height={xAxisHeight} />
                          <YAxis tick={AXIS_STYLE} tickFormatter={fmtYAxis} width={45} />
                          <Tooltip content={<RichTooltip />} />
                          <Area
                            type="monotone" dataKey="acumulado" name="Acumulado"
                            stroke={BRAND_RED} fill="url(#gradAcum)" strokeWidth={2}
                            animationDuration={800} animationEasing="ease-out"
                            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  {/* Peso diário */}
                  <ChartCard title="Peso Diário" subtitle="Peso total e peso carregado por dia">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={a?.dailyWeight ?? []} margin={{ top: 5, right: 10, left: 0, bottom: xAxisHeight - 25 }}>
                          <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} vertical={false} />
                          <XAxis dataKey="date" tickFormatter={fmtDate} tick={xTickProps} height={xAxisHeight} />
                          <YAxis tick={AXIS_STYLE} tickFormatter={fmtYAxis} width={45} />
                          <Tooltip content={<RichTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
                          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                          <Bar dataKey="peso" name="Peso Total" fill={NAVY} radius={[4, 4, 0, 0]} animationDuration={800} />
                          <Bar dataKey="carregado" name="Carregado" fill={EMERALD} radius={[4, 4, 0, 0]} animationDuration={1000} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══════ TAB: EXPEDIÇÃO ═══════ */}
          <TabsContent value="expedicao">
            {!hasData && !isLoading ? <EmptyState /> : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Peso por tipo caminhão stacked */}
                  <ChartCard title="Peso por Tipo de Veículo" subtitle="Distribuição diária empilhada por tipo de veículo">
                    <div className="h-72">
                      {(a?.tipoKeys?.length ?? 0) === 0 ? <EmptyState /> : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={a?.dailyByTipo ?? []} margin={{ top: 5, right: 10, left: 0, bottom: xAxisHeight - 25 }}>
                            <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} vertical={false} />
                            <XAxis dataKey="date" tickFormatter={fmtDate} tick={xTickProps} height={xAxisHeight} />
                            <YAxis tick={AXIS_STYLE} tickFormatter={fmtYAxis} width={45} />
                            <Tooltip content={<RichTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
                            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                            {a!.tipoKeys.map((tipo, i) => (
                              <Bar
                                key={tipo} dataKey={tipo} stackId="a"
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                                radius={i === a!.tipoKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                                animationDuration={800}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </ChartCard>

                  {/* Tipo breakdown ranking */}
                  <ChartCard title="Resumo por Tipo de Veículo" subtitle="Ranking de peso por tipo de veículo" headerAction={
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                      if (!a?.tipoCaminhaoBreakdown) return;
                      exportCsv(["Tipo", "Peso (kg)", "Pedidos"], a.tipoCaminhaoBreakdown.map((t) => [t.tipo, t.peso, t.pedidos]), "tipo_caminhao.csv");
                    }}>
                      <Download className="h-3 w-3" /> CSV
                    </Button>
                  }>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Tipo</TableHead>
                          <TableHead className="text-right text-xs">Peso (kg)</TableHead>
                          <TableHead className="text-right text-xs">Pedidos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(a?.tipoCaminhaoBreakdown ?? []).map((t) => (
                          <PremiumTableRow
                            key={t.tipo}
                            cells={[t.tipo, t.peso, t.pedidos]}
                            progressValue={t.peso}
                            maxProgress={maxTipoPeso}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </ChartCard>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══════ TAB: VENDEDORES ═══════ */}
          <TabsContent value="vendedores">
            {!hasData && !isLoading ? <EmptyState /> : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Ranking visual com progress bars */}
                  <ChartCard title="Ranking de Vendedores" subtitle="Top 10 por peso total expedido">
                    <div className="py-2">
                      {(a?.vendedorRanking?.length ?? 0) === 0 ? <EmptyState /> : (
                        <VendorRanking data={a!.vendedorRanking} maxPeso={maxVendPeso} />
                      )}
                    </div>
                  </ChartCard>

                  {/* Bar chart horizontal */}
                  <ChartCard title="Peso por Vendedor" subtitle="Gráfico de barras horizontais por vendedor">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={a?.vendedorRanking?.slice(0, 10) ?? []} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} horizontal={false} />
                          <XAxis type="number" tick={AXIS_STYLE} tickFormatter={fmtYAxis} />
                          <YAxis type="category" dataKey="nome" tick={{ ...AXIS_STYLE, fontSize: yAxisCatFontSize }} width={isMobile ? 70 : 100} />
                          <Tooltip content={<RichTooltip formatLabel={(v: string) => v} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }} />
                          <Bar dataKey="peso" name="Peso" fill={NAVY} radius={[0, 5, 5, 0]} animationDuration={800} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                </div>

                {/* Tabela vendedores */}
                <ChartCard title="Detalhamento por Vendedor" subtitle="Tabela completa com métricas por vendedor" headerAction={
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                    if (!a?.vendedorRanking) return;
                    exportCsv(
                      ["Vendedor", "Peso (kg)", "Pedidos", "% Participação", "Média/Pedido (kg)"],
                      a.vendedorRanking.map((v) => [v.nome, v.peso, v.pedidos, v.participacao, v.mediaPorPedido]),
                      "vendedores.csv"
                    );
                  }}>
                    <Download className="h-3 w-3" /> CSV
                  </Button>
                }>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Vendedor</TableHead>
                        <TableHead className="text-right text-xs">Peso (kg)</TableHead>
                        <TableHead className="text-right text-xs">Pedidos</TableHead>
                        <TableHead className="text-right text-xs">% Part.</TableHead>
                        <TableHead className="text-right text-xs">Média/Pedido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(a?.vendedorRanking ?? []).map((v) => (
                        <PremiumTableRow
                          key={v.nome}
                          cells={[v.nome, v.peso, v.pedidos, `${v.participacao}%`, v.mediaPorPedido]}
                          progressValue={v.peso}
                          maxProgress={maxVendPeso}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </ChartCard>
              </div>
            )}
          </TabsContent>

          {/* ═══════ TAB: RUPTURAS ═══════ */}
          <TabsContent value="rupturas">
            {(() => {
              const totalRupturas = (a?.rupturaKpis?.totalRupturasTotais ?? 0) + (a?.rupturaKpis?.totalRupturasParciais ?? 0);
              if (totalRupturas === 0 && !isLoading) {
                return <EmptyState message="Nenhuma ruptura no período selecionado" />;
              }
              return (
              <div className="space-y-4">
                {/* Ruptura KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
                  <Card className="border-border/40">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 rounded-lg bg-amber-500/10"><Weight className="h-3.5 w-3.5 text-amber-600" /></div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">Não Carregado</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-amber-700 tabular-nums tracking-tight truncate">{fmtTon(a?.rupturaKpis?.totalPesoNaoCarregado ?? 0)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{(a?.rupturaKpis?.totalPesoNaoCarregado ?? 0).toLocaleString("pt-BR")} kg</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/40">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 rounded-lg bg-amber-500/10"><Minus className="h-3.5 w-3.5 text-amber-600" /></div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">Rupturas Parciais</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-amber-700 tabular-nums tracking-tight">{a?.rupturaKpis?.totalRupturasParciais ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{a?.rupturaKpis?.totalRupturasTotais ?? 0} totais</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/40">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 rounded-lg bg-orange-500/10"><AlertTriangle className="h-3.5 w-3.5 text-orange-500" /></div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">Rupturas Abertas</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums tracking-tight">{a?.rupturaKpis?.sinalizadasAbertas ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{a?.rupturaKpis?.sinalizadasResolvidas ?? 0} já resolvidas</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/40">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">Dias sem Ruptura</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-emerald-600 tabular-nums tracking-tight">{a?.rupturaKpis?.diasSemRuptura ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/40">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 rounded-lg bg-red-500/10"><AlertTriangle className="h-3.5 w-3.5 text-red-500" /></div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">Pior Dia</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-red-500 tabular-nums tracking-tight">
                        {a?.rupturaKpis?.piorDia ? `${a.rupturaKpis.piorDia.taxa}%` : "—"}
                      </p>
                      {a?.rupturaKpis?.piorDia && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(a.rupturaKpis.piorDia.date)}</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="border-border/40">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 rounded-lg bg-amber-500/10"><Calendar className="h-3.5 w-3.5 text-amber-500" /></div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">Média Semanal</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight">{a?.rupturaKpis?.mediaSemanal ?? 0}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Taxa diária */}
                  <ChartCard title="Taxa de Ruptura Diária" subtitle="Percentual de rupturas e contagem absoluta por dia">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={a?.rupturaDaily ?? []} margin={{ top: 5, right: 10, left: 0, bottom: xAxisHeight - 25 }}>
                          <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} vertical={false} />
                          <XAxis dataKey="date" tickFormatter={fmtDate} tick={xTickProps} height={xAxisHeight} />
                          <YAxis tick={AXIS_STYLE} unit="%" width={40} />
                          <Tooltip content={<RichTooltip suffix="%" />} />
                          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                          <Line
                            type="monotone" dataKey="taxa" name="Taxa %"
                            stroke={BRAND_RED} strokeWidth={2}
                            dot={{ r: 2.5, fill: BRAND_RED }}
                            activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))", fill: BRAND_RED }}
                            animationDuration={800}
                          />
                          <Line
                            type="monotone" dataKey="rupturas" name="Rupturas"
                            stroke={SLATE_SOLID} strokeWidth={1.5} strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                            animationDuration={1000}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  {/* Ranking produtos rupturas */}
                  <ChartCard title="Produtos com Mais Rupturas" subtitle="Top 10 produtos por peso não carregado" headerAction={
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                      if (!a?.produtoRupturas) return;
                      exportCsv(
                        ["Produto", "Ocorrências", "Peso Não Carregado (kg)"],
                        a.produtoRupturas.map((p) => [p.produto, p.rupturas, Math.round(p.pesoNaoCarregado)]),
                        "produtos_ruptura.csv"
                      );
                    }}>
                      <Download className="h-3 w-3" /> CSV
                    </Button>
                  }>
                    <div className="h-72">
                      {(a?.produtoRupturas?.length ?? 0) === 0 ? <EmptyState message="Nenhuma ruptura no período" /> : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={a?.produtoRupturas ?? []} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} horizontal={false} />
                            <XAxis type="number" tick={AXIS_STYLE} tickFormatter={fmtYAxis} />
                            <YAxis type="category" dataKey="produto" tick={{ ...AXIS_STYLE, fontSize: yAxisCatFontSize }} width={yAxisCatWidth} />
                            <Tooltip
                              content={({ active, payload, label }: any) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0]?.payload;
                                return (
                                  <div className="bg-popover/95 backdrop-blur-md border border-border/60 rounded-lg shadow-2xl p-3 text-xs min-w-[170px]">
                                    <p className="font-semibold text-foreground mb-2 pb-1.5 border-b border-border/40 text-[11px]">{d?.produto}</p>
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between gap-4">
                                        <span className="text-muted-foreground text-[11px]">Não carregado</span>
                                        <span className="font-bold text-amber-700 tabular-nums text-[11px]">{Math.round(d?.pesoNaoCarregado ?? 0).toLocaleString("pt-BR")} <span className="text-muted-foreground font-normal">kg</span></span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4">
                                        <span className="text-muted-foreground text-[11px]">Ocorrências</span>
                                        <span className="font-bold text-foreground tabular-nums text-[11px]">{d?.rupturas}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }}
                              cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }}
                            />
                            <Bar dataKey="pesoNaoCarregado" name="Peso não carregado" fill="#D97706" radius={[0, 5, 5, 0]} animationDuration={800} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </ChartCard>
                </div>

                {/* Clientes Afetados + Cargas com Pendência */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard title="Clientes Afetados" subtitle="Top 10 clientes por peso não carregado" headerAction={
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                      if (!a?.clienteRupturas) return;
                      exportCsv(
                        ["Código", "Cliente", "Ocorrências", "Peso Não Carregado (kg)", "Produtos"],
                        a.clienteRupturas.map((c) => [c.codigo, c.nome, c.ocorrencias, Math.round(c.pesoNaoCarregado), c.produtos.join(" | ")]),
                        "clientes_ruptura.csv"
                      );
                    }}>
                      <Download className="h-3 w-3" /> CSV
                    </Button>
                  }>
                    {(a?.clienteRupturas?.length ?? 0) === 0 ? (
                      <EmptyState message="Nenhum cliente afetado" />
                    ) : (
                      <div className="overflow-x-auto">
                      <Table className="min-w-[460px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Cliente</TableHead>
                            <TableHead className="text-right text-xs">Ocorr.</TableHead>
                            <TableHead className="text-right text-xs">Não Carreg.</TableHead>
                            <TableHead className="text-xs">Produtos</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {a!.clienteRupturas.slice(0, 10).map((c) => (
                            <TableRow key={c.codigo + c.nome} className="hover:bg-muted/30">
                              <TableCell className="py-2.5">
                                <div className="flex flex-col">
                                  <span className="font-medium text-xs break-words">{c.nome}</span>
                                  {c.codigo !== "S/CÓD" && <span className="text-[10px] text-muted-foreground tabular-nums">#{c.codigo}</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs py-2.5">{c.ocorrencias}</TableCell>
                              <TableCell className="text-right tabular-nums text-xs font-bold text-amber-700 py-2.5">
                                {Math.round(c.pesoNaoCarregado).toLocaleString("pt-BR")} kg
                              </TableCell>
                              <TableCell className="py-2.5 min-w-[220px] max-w-[320px]">
                                <div className="flex flex-wrap gap-1">
                                  {c.produtos.map((p) => (
                                    <span key={p} className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded border border-border/50 break-words">
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    )}
                  </ChartCard>

                  <ChartCard title="Cargas com Pendência" subtitle="Cargas que tiveram itens não carregados" headerAction={
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                      if (!a?.cargasComPendencia) return;
                      exportCsv(
                        ["Carga", "Ocorrências", "Peso Não Carregado (kg)", "Motoristas"],
                        a.cargasComPendencia.map((c) => [c.nomeCarga, c.ocorrencias, Math.round(c.pesoNaoCarregado), c.motoristas.join(" | ")]),
                        "cargas_pendencia.csv"
                      );
                    }}>
                      <Download className="h-3 w-3" /> CSV
                    </Button>
                  }>
                    {(a?.cargasComPendencia?.length ?? 0) === 0 ? (
                      <EmptyState message="Nenhuma carga com pendência" />
                    ) : (
                      <div className="overflow-x-auto">
                      <Table className="min-w-[460px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Carga</TableHead>
                            <TableHead className="text-right text-xs">Ocorr.</TableHead>
                            <TableHead className="text-right text-xs">Não Carreg.</TableHead>
                            <TableHead className="text-xs">Motoristas</TableHead>
                            <TableHead className="text-xs"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {a!.cargasComPendencia.slice(0, 10).map((c) => (
                            <TableRow key={c.cargaId} className="hover:bg-muted/30">
                              <TableCell className="py-2.5">
                                <div className="flex flex-col">
                                  <span className="font-medium text-xs break-words">{c.nomeCarga}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs py-2.5">{c.ocorrencias}</TableCell>
                              <TableCell className="text-right tabular-nums text-xs font-bold text-amber-700 py-2.5">
                                {Math.round(c.pesoNaoCarregado).toLocaleString("pt-BR")} kg
                              </TableCell>
                              <TableCell className="py-2.5 min-w-[180px] max-w-[260px]">
                                <div className="flex flex-wrap gap-1">
                                  {c.motoristas.map((m) => (
                                    <span key={m} className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded border border-border/50 break-words">
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <a
                                  href={`/rupturas?carga=${encodeURIComponent(c.nomeCarga)}`}
                                  className="text-[10px] text-primary hover:underline whitespace-nowrap"
                                >
                                  Ver →
                                </a>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    )}
                  </ChartCard>
                </div>

                {/* Motivos */}
                <ChartCard title="Motivos da Ruptura" subtitle="Distribuição de peso não carregado por motivo informado">
                  {(a?.motivoBreakdown?.length ?? 0) === 0 ? (
                    <EmptyState message="Sem motivos informados no período" />
                  ) : (
                    <div className="space-y-2.5 py-2">
                      {(() => {
                        const max = a!.motivoBreakdown[0]?.peso ?? 1;
                        return a!.motivoBreakdown.map((m, i) => {
                          const pct = max > 0 ? (m.peso / max) * 100 : 0;
                          return (
                            <div key={m.motivo}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-muted-foreground w-5 text-right tabular-nums">{i + 1}.</span>
                                  <span className="text-xs font-medium capitalize">{m.motivo}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-muted-foreground tabular-nums">{m.count} ocorr.</span>
                                  <span className="text-xs font-bold tabular-nums text-amber-700">{Math.round(m.peso).toLocaleString("pt-BR")} kg</span>
                                </div>
                              </div>
                              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700 ease-out"
                                  style={{ width: `${pct}%`, backgroundColor: "#D97706", opacity: Math.max(0.4, 1 - i * 0.1) }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </ChartCard>

              </div>
              );
            })()}
          </TabsContent>

          {/* ═══════ TAB: GEOGRAFIA ═══════ */}
          <TabsContent value="geografia">
            {!hasData && !isLoading ? <EmptyState /> : (
              <div className="space-y-4">
                {a?.semUfStats && a.semUfStats.pedidos > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <span className="font-semibold text-amber-700">Pedidos sem UF informada: </span>
                      <span className="tabular-nums">
                        {a.semUfStats.pedidos} pedido(s) · {a.semUfStats.peso.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg
                      </span>
                      <span className="text-muted-foreground ml-1">— excluídos do ranking abaixo. Cadastre a UF do cliente para entrarem nas estatísticas geográficas.</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Bar horizontal UFs */}
                  <ChartCard title="Peso por UF" subtitle="Distribuição de peso por estado">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={a?.ufDistribution?.slice(0, 10) ?? []} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} horizontal={false} />
                          <XAxis type="number" tick={AXIS_STYLE} tickFormatter={fmtYAxis} />
                          <YAxis type="category" dataKey="uf" tick={AXIS_STYLE} width={40} />
                          <Tooltip content={<RichTooltip suffix="kg" formatLabel={(v: string) => v} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }} />
                          <Bar dataKey="peso" name="Peso" fill={NAVY} radius={[0, 5, 5, 0]} animationDuration={800} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  {/* UF Ranking list */}
                  <ChartCard title="Ranking por UF" subtitle="Participação percentual de cada estado">
                    <div className="space-y-2.5 py-2">
                      {(a?.ufDistribution ?? []).slice(0, 10).map((u, i) => {
                        const pct = maxUfPeso > 0 ? (u.peso / maxUfPeso) * 100 : 0;
                        return (
                          <div key={u.uf}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground w-5 text-right tabular-nums">{i + 1}.</span>
                                <span className="text-xs font-semibold">{u.uf}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-muted-foreground tabular-nums">{u.participacao}%</span>
                                <span className="text-xs font-bold tabular-nums">{fmtTon(u.peso)}</span>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${pct}%`, backgroundColor: NAVY, opacity: Math.max(0.3, 1 - i * 0.08) }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ChartCard>
                </div>

                {/* Tabela UF */}
                <ChartCard title="Detalhamento por UF" headerAction={
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                    if (!a?.ufDistribution) return;
                    exportCsv(["UF", "Peso (kg)", "Pedidos", "% Part."], a.ufDistribution.map((u) => [u.uf, u.peso, u.pedidos, u.participacao]), "uf_distribuicao.csv");
                  }}>
                    <Download className="h-3 w-3" /> CSV
                  </Button>
                }>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">UF</TableHead>
                        <TableHead className="text-right text-xs">Peso (kg)</TableHead>
                        <TableHead className="text-right text-xs">Pedidos</TableHead>
                        <TableHead className="text-right text-xs">% Part.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(a?.ufDistribution ?? []).map((u) => (
                        <PremiumTableRow
                          key={u.uf}
                          cells={[u.uf, u.peso, u.pedidos, `${u.participacao}%`]}
                          progressValue={u.peso}
                          maxProgress={maxUfPeso}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </ChartCard>
              </div>
            )}
          </TabsContent>

          {/* ═══════ TAB: HISTÓRICO DE ROTAS ═══════ */}
          <TabsContent value="rotas">
            <RotasExecutadasPanel />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// ─── Histórico de Rotas (inline component) ───
function RotasExecutadasPanel() {
  const { data: rotas = [], isLoading } = useRotasExecutadas(200);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (rotas.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Nenhuma rota executada registrada ainda. Feche uma carga com roteirização para começar a registrar histórico.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Carga</TableHead>
            <TableHead className="text-right">KM Plan.</TableHead>
            <TableHead className="text-right">KM Real</TableHead>
            <TableHead className="text-right">Δ KM</TableHead>
            <TableHead className="text-right">Custo Plan. (R$)</TableHead>
            <TableHead className="text-right">Tempo Plan.</TableHead>
            <TableHead>Caminhão</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rotas.map((r) => {
            const delta = r.km_real != null && r.km_planejado != null ? r.km_real - r.km_planejado : null;
            const dur = r.duracao_planejada_min;
            const durFmt = dur != null ? (dur >= 60 ? `${Math.floor(dur / 60)}h ${dur % 60}min` : `${dur}min`) : "—";
            return (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.data_referencia + "T12:00:00"), "dd/MM/yy", { locale: ptBR })}</TableCell>
                <TableCell className="text-xs font-mono">{r.carga_id}</TableCell>
                <TableCell className="text-right text-xs font-mono">{r.km_planejado?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                <TableCell className="text-right text-xs font-mono">{r.km_real?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                <TableCell className={cn("text-right text-xs font-mono", delta != null && delta > 0 && "text-amber-600", delta != null && delta < 0 && "text-emerald-600")}>
                  {delta != null ? (delta > 0 ? "+" : "") + delta.toLocaleString("pt-BR") : "—"}
                </TableCell>
                <TableCell className="text-right text-xs font-mono">{r.custo_planejado != null ? r.custo_planejado.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—"}</TableCell>
                <TableCell className="text-right text-xs">{durFmt}</TableCell>
                <TableCell className="text-xs">{r.tipo_caminhao ?? "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// (HeatmapGrid removido — funcionalidade duplicava o gráfico de Taxa Diária)
