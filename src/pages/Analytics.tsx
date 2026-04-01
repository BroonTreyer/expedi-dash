import { useState, useMemo, useCallback } from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Weight, Package, AlertTriangle, TrendingUp, TrendingDown, Calendar, BarChart3,
  Download, ArrowUpRight, ArrowDownRight, Minus, Eye, Truck, Users, MapPin, XCircle,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
  Treemap, Sector,
} from "recharts";
import { useAnalytics, type AnalyticsFilters } from "@/hooks/useAnalytics";

// ── Period ──
const PERIOD_OPTIONS = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "15d", label: "Últimos 15 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "mes_atual", label: "Mês atual" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "90d", label: "Últimos 90 dias" },
];

const CHART_COLORS = [
  "hsl(215, 80%, 55%)", "hsl(358, 76%, 48%)", "hsl(122, 39%, 49%)",
  "hsl(45, 93%, 47%)", "hsl(280, 60%, 55%)", "hsl(190, 70%, 45%)",
  "hsl(30, 80%, 55%)", "hsl(330, 60%, 50%)", "hsl(160, 50%, 45%)",
  "hsl(0, 0%, 55%)",
];

const STATUS_COLORS: Record<string, string> = {
  "Aguardando": "hsl(45, 93%, 47%)",
  "Carregando": "hsl(215, 80%, 55%)",
  "Carregado": "hsl(122, 39%, 49%)",
};

function getDateRange(period: string) {
  const today = new Date();
  switch (period) {
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
  const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Variation badge ──
function VarBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[10px] text-muted-foreground">—</span>;
  const isUp = value > 0;
  const isZero = value === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isZero ? "text-muted-foreground" : isUp ? "text-emerald-600" : "text-red-500"}`}>
      {isZero ? <Minus className="h-2.5 w-2.5" /> : isUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {Math.abs(value)}%
    </span>
  );
}

// ── KPI Card ──
function KpiCard({ label, value, icon: Icon, color, variation, loading }: {
  label: string; value: string; icon: any; color: string; variation: number | null; loading: boolean;
}) {
  if (loading) return (
    <Card className="border-border/60">
      <CardContent className="p-3 sm:p-4 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-24" />
      </CardContent>
    </Card>
  );
  return (
    <Card className="border-border/60 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${color}`} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base sm:text-xl font-bold tracking-tight truncate">{value}</span>
          <VarBadge value={variation} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Rich Tooltip ──
function RichTooltip({ active, payload, label, suffix = "kg", formatLabel }: any) {
  if (!active || !payload?.length) return null;
  const displayLabel = formatLabel ? formatLabel(label) : fmtDate(label);
  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl shadow-xl p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-foreground mb-2 pb-1.5 border-b border-border/50">{displayLabel}</p>
      <div className="space-y-1.5">
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-muted-foreground">{p.name}</span>
            </div>
            <span className="font-bold text-foreground tabular-nums">
              {typeof p.value === "number" ? p.value.toLocaleString("pt-BR") : p.value}
              {suffix && <span className="text-muted-foreground font-normal ml-0.5">{suffix}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pie Tooltip ──
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl shadow-xl p-3 text-xs min-w-[140px]">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.payload.fill }} />
        <span className="font-semibold text-foreground">{item.name}</span>
      </div>
      <div className="flex justify-between gap-4 mt-1.5">
        <span className="text-muted-foreground">Quantidade</span>
        <span className="font-bold tabular-nums">{item.value.toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}

// ── Active Pie Shape ──
function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 3}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.95}
      />
      <Sector
        cx={cx} cy={cy}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.4}
      />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={14} fontWeight={700}>
        {payload.status}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>
        {value} ({(percent * 100).toFixed(0)}%)
      </text>
    </g>
  );
}

// ── Empty state ──
function EmptyState({ message = "Sem dados para o período selecionado" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-12">
      <BarChart3 className="h-8 w-8 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Filter chip toggle ──
function FilterChips({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  if (options.length <= 1) return null;
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mr-1">{label}:</span>
      {options.slice(0, 12).map((o) => (
        <Badge
          key={o}
          variant={selected.includes(o) ? "default" : "outline"}
          className="cursor-pointer text-[10px] px-2 py-0.5 font-normal"
          onClick={() => toggle(o)}
        >
          {o}
        </Badge>
      ))}
      {selected.length > 0 && (
        <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px] text-muted-foreground" onClick={() => onChange([])}>
          <XCircle className="h-3 w-3 mr-0.5" /> Limpar
        </Button>
      )}
    </div>
  );
}

// ── Treemap custom content ──
function TreemapContent(props: any) {
  const { x, y, width, height, name, peso, index } = props;
  if (width < 40 || height < 25) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={CHART_COLORS[index % CHART_COLORS.length]} rx={6} opacity={0.88} stroke="hsl(var(--background))" strokeWidth={2} />
      <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={width > 60 ? 12 : 10} fontWeight={600}>
        {name}
      </text>
      {height > 40 && (
        <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={9}>
          {fmtTon(peso || 0)}
        </text>
      )}
    </g>
  );
}

// ── Shared axis config ──
const AXIS_STYLE = { fill: "hsl(var(--muted-foreground))", fontSize: 10 };
const GRID_STYLE = "stroke-border/30";

// ══════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════
export default function Analytics() {
  const [period, setPeriod] = useState("30d");
  const [filterVendedores, setFilterVendedores] = useState<string[]>([]);
  const [filterTipos, setFilterTipos] = useState<string[]>([]);
  const [filterUfs, setFilterUfs] = useState<string[]>([]);
  const [activePieIndex, setActivePieIndex] = useState(0);

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
    diasUnicos: 0, mediaDiaria: 0, taxaRuptura: 0,
    varPeso: null, varPedidos: null, varRupturas: null,
    varCarregado: null, varMediaDiaria: null, varTaxaRuptura: null,
  };

  const hasData = (a?.dailyWeight?.length ?? 0) > 0;

  // X axis tick props (rotate when many days)
  const xTickProps = manyDays
    ? { angle: -45, textAnchor: "end" as const, ...AXIS_STYLE }
    : AXIS_STYLE;
  const xAxisHeight = manyDays ? 50 : 30;

  const kpiCards = [
    { label: "Peso Total", value: fmtKg(kpis.totalPeso), icon: Weight, color: "text-foreground", variation: kpis.varPeso },
    { label: "Total Pedidos", value: kpis.totalPedidos.toLocaleString("pt-BR"), icon: Package, color: "text-primary", variation: kpis.varPedidos },
    { label: "Peso Carregado", value: fmtKg(kpis.totalCarregado), icon: BarChart3, color: "text-emerald-600", variation: kpis.varCarregado },
    { label: "Média Diária", value: fmtKg(kpis.mediaDiaria), icon: TrendingUp, color: "text-accent", variation: kpis.varMediaDiaria },
    { label: "Taxa Ruptura", value: `${kpis.taxaRuptura}%`, icon: AlertTriangle, color: "text-amber-500", variation: kpis.varTaxaRuptura },
    { label: "Dias no Período", value: String(kpis.diasUnicos), icon: Calendar, color: "text-blue-500", variation: null },
  ];

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground">Painel gerencial de expedição — visão comparativa</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filters */}
        {a?.filterOptions && (
          <div className="space-y-1.5">
            <FilterChips label="Vendedor" options={a.filterOptions.uniqueVendedores} selected={filterVendedores} onChange={setFilterVendedores} />
            <FilterChips label="Tipo" options={a.filterOptions.uniqueTipos} selected={filterTipos} onChange={setFilterTipos} />
            <FilterChips label="UF" options={a.filterOptions.uniqueUfs} selected={filterUfs} onChange={setFilterUfs} />
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
          {kpiCards.map((c) => (
            <KpiCard key={c.label} {...c} loading={isLoading} />
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="visao" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="visao" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" /> Visão Geral</TabsTrigger>
            <TabsTrigger value="expedicao" className="gap-1.5 text-xs"><Truck className="h-3.5 w-3.5" /> Expedição</TabsTrigger>
            <TabsTrigger value="vendedores" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Vendedores</TabsTrigger>
            <TabsTrigger value="rupturas" className="gap-1.5 text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Rupturas</TabsTrigger>
            <TabsTrigger value="geografia" className="gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5" /> Geografia</TabsTrigger>
          </TabsList>

          {/* ═══════ TAB: VISÃO GERAL ═══════ */}
          <TabsContent value="visao">
            {!hasData && !isLoading ? <EmptyState /> : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Peso acumulado */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Peso Acumulado no Período</CardTitle></CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={a?.dailyWeight ?? []} margin={{ top: 5, right: 10, left: 0, bottom: xAxisHeight - 25 }}>
                        <defs>
                          <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} vertical={false} />
                        <XAxis dataKey="date" tickFormatter={fmtDate} tick={xTickProps} height={xAxisHeight} />
                        <YAxis tick={AXIS_STYLE} tickFormatter={fmtYAxis} width={45} />
                        <Tooltip content={<RichTooltip />} />
                        <Area
                          type="monotone" dataKey="acumulado" name="Acumulado"
                          stroke="hsl(var(--primary))" fill="url(#gradAcum)" strokeWidth={2.5}
                          animationDuration={800} animationEasing="ease-out"
                          activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Status donut with active shape */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Distribuição por Status</CardTitle></CardHeader>
                  <CardContent className="h-72">
                    {(a?.statusBreakdown?.length ?? 0) === 0 ? <EmptyState /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={a!.statusBreakdown}
                            dataKey="count"
                            nameKey="status"
                            cx="50%" cy="50%"
                            innerRadius={50} outerRadius={85}
                            paddingAngle={4}
                            activeIndex={activePieIndex}
                            activeShape={renderActiveShape}
                            onMouseEnter={(_, index) => setActivePieIndex(index)}
                            animationDuration={800}
                            animationEasing="ease-out"
                          >
                            {a!.statusBreakdown.map((s) => (
                              <Cell key={s.status} fill={STATUS_COLORS[s.status] || "hsl(0,0%,55%)"} />
                            ))}
                          </Pie>
                          <Tooltip content={<PieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ═══════ TAB: EXPEDIÇÃO ═══════ */}
          <TabsContent value="expedicao">
            {!hasData && !isLoading ? <EmptyState /> : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Peso diário */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Peso Expedido por Dia</CardTitle></CardHeader>
                    <CardContent className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={a?.dailyWeight ?? []} margin={{ top: 5, right: 10, left: 0, bottom: xAxisHeight - 25 }}>
                          <defs>
                            <linearGradient id="gradPeso" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradCarr" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(122, 39%, 49%)" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(122, 39%, 49%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} vertical={false} />
                          <XAxis dataKey="date" tickFormatter={fmtDate} tick={xTickProps} height={xAxisHeight} />
                          <YAxis tick={AXIS_STYLE} tickFormatter={fmtYAxis} width={45} />
                          <Tooltip content={<RichTooltip />} />
                          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                          <Area
                            type="monotone" dataKey="peso" name="Peso Total"
                            stroke="hsl(var(--primary))" fill="url(#gradPeso)" strokeWidth={2}
                            animationDuration={800} animationEasing="ease-out"
                            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                          />
                          <Area
                            type="monotone" dataKey="carregado" name="Carregado"
                            stroke="hsl(122, 39%, 49%)" fill="url(#gradCarr)" strokeWidth={2}
                            animationDuration={1000} animationEasing="ease-out"
                            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Peso por tipo caminhão stacked */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Peso por Tipo de Caminhão</CardTitle></CardHeader>
                    <CardContent className="h-72">
                      {(a?.tipoKeys?.length ?? 0) === 0 ? <EmptyState /> : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={a?.dailyByTipo ?? []} margin={{ top: 5, right: 10, left: 0, bottom: xAxisHeight - 25 }}>
                            <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} vertical={false} />
                            <XAxis dataKey="date" tickFormatter={fmtDate} tick={xTickProps} height={xAxisHeight} />
                            <YAxis tick={AXIS_STYLE} tickFormatter={fmtYAxis} width={45} />
                            <Tooltip content={<RichTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                            {a!.tipoKeys.map((tipo, i) => (
                              <Bar
                                key={tipo} dataKey={tipo} stackId="a"
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                                radius={i === a!.tipoKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                                animationDuration={800} animationEasing="ease-out"
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Tipo caminhão breakdown table */}
                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Resumo por Tipo de Caminhão</CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                      if (!a?.tipoCaminhaoBreakdown) return;
                      exportCsv(
                        ["Tipo", "Peso (kg)", "Pedidos"],
                        a.tipoCaminhaoBreakdown.map((t) => [t.tipo, t.peso, t.pedidos]),
                        "tipo_caminhao.csv"
                      );
                    }}>
                      <Download className="h-3 w-3" /> CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Peso (kg)</TableHead>
                          <TableHead className="text-right">Pedidos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(a?.tipoCaminhaoBreakdown ?? []).map((t) => (
                          <TableRow key={t.tipo}>
                            <TableCell className="font-medium">{t.tipo}</TableCell>
                            <TableCell className="text-right tabular-nums">{t.peso.toLocaleString("pt-BR")}</TableCell>
                            <TableCell className="text-right tabular-nums">{t.pedidos}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ═══════ TAB: VENDEDORES ═══════ */}
          <TabsContent value="vendedores">
            {!hasData && !isLoading ? <EmptyState /> : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Bar horizontal */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Vendedores (Peso)</CardTitle></CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={a?.vendedorRanking?.slice(0, 10) ?? []} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="gradBar" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} horizontal={false} />
                          <XAxis type="number" tick={AXIS_STYLE} tickFormatter={fmtYAxis} />
                          <YAxis type="category" dataKey="nome" tick={{ ...AXIS_STYLE, fontSize: 9 }} width={100} />
                          <Tooltip content={<RichTooltip formatLabel={(v: string) => v} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
                          <Bar
                            dataKey="peso" name="Peso" fill="url(#gradBar)" radius={[0, 6, 6, 0]}
                            animationDuration={800} animationEasing="ease-out"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Treemap vendedores */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Participação por Vendedor</CardTitle></CardHeader>
                    <CardContent className="h-80">
                      {(a?.vendedorRanking?.length ?? 0) === 0 ? <EmptyState /> : (
                        <ResponsiveContainer width="100%" height="100%">
                          <Treemap
                            data={(a?.vendedorRanking ?? []).map((v) => ({ name: v.nome, peso: v.peso, size: v.peso }))}
                            dataKey="size"
                            aspectRatio={4 / 3}
                            content={<TreemapContent />}
                            animationDuration={600}
                            animationEasing="ease-out"
                          />
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela vendedores */}
                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Detalhamento por Vendedor</CardTitle>
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
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendedor</TableHead>
                          <TableHead className="text-right">Peso (kg)</TableHead>
                          <TableHead className="text-right">Pedidos</TableHead>
                          <TableHead className="text-right">% Part.</TableHead>
                          <TableHead className="text-right">Média/Pedido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(a?.vendedorRanking ?? []).map((v) => (
                          <TableRow key={v.nome}>
                            <TableCell className="font-medium">{v.nome}</TableCell>
                            <TableCell className="text-right tabular-nums">{v.peso.toLocaleString("pt-BR")}</TableCell>
                            <TableCell className="text-right tabular-nums">{v.pedidos}</TableCell>
                            <TableCell className="text-right tabular-nums">{v.participacao}%</TableCell>
                            <TableCell className="text-right tabular-nums">{v.mediaPorPedido.toLocaleString("pt-BR")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ═══════ TAB: RUPTURAS ═══════ */}
          <TabsContent value="rupturas">
            {!hasData && !isLoading ? <EmptyState /> : (
              <div className="space-y-4">
                {/* Ruptura KPIs */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="border-border/60">
                    <CardContent className="p-3 sm:p-4">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Dias sem Ruptura</span>
                      <p className="text-xl font-bold text-emerald-600">{a?.rupturaKpis?.diasSemRuptura ?? 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/60">
                    <CardContent className="p-3 sm:p-4">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Pior Dia</span>
                      <p className="text-xl font-bold text-red-500">
                        {a?.rupturaKpis?.piorDia ? `${a.rupturaKpis.piorDia.taxa}% (${fmtDate(a.rupturaKpis.piorDia.date)})` : "—"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/60">
                    <CardContent className="p-3 sm:p-4">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Média Semanal</span>
                      <p className="text-xl font-bold">{a?.rupturaKpis?.mediaSemanal ?? 0}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Taxa diária */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Taxa de Ruptura Diária (%)</CardTitle></CardHeader>
                    <CardContent className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={a?.rupturaDaily ?? []} margin={{ top: 5, right: 10, left: 0, bottom: xAxisHeight - 25 }}>
                          <defs>
                            <linearGradient id="gradRupt" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.15} />
                              <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} vertical={false} />
                          <XAxis dataKey="date" tickFormatter={fmtDate} tick={xTickProps} height={xAxisHeight} />
                          <YAxis tick={AXIS_STYLE} unit="%" width={40} />
                          <Tooltip content={<RichTooltip suffix="%" />} />
                          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                          <Line
                            type="monotone" dataKey="taxa" name="Taxa %"
                            stroke="hsl(var(--destructive))" strokeWidth={2.5}
                            dot={{ r: 3, fill: "hsl(var(--destructive))" }}
                            activeDot={{ r: 7, strokeWidth: 2, stroke: "hsl(var(--background))", fill: "hsl(var(--destructive))" }}
                            animationDuration={800} animationEasing="ease-out"
                          />
                          <Line
                            type="monotone" dataKey="rupturas" name="Rupturas"
                            stroke="hsl(45, 93%, 47%)" strokeWidth={1.5} strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                            animationDuration={1000} animationEasing="ease-out"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Ranking produtos rupturas */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Produtos com Mais Rupturas</CardTitle></CardHeader>
                    <CardContent className="h-72">
                      {(a?.produtoRupturas?.length ?? 0) === 0 ? <EmptyState message="Nenhuma ruptura no período" /> : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={a?.produtoRupturas ?? []} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <defs>
                              <linearGradient id="gradRuptBar" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.6} />
                                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} horizontal={false} />
                            <XAxis type="number" tick={AXIS_STYLE} />
                            <YAxis type="category" dataKey="produto" tick={{ ...AXIS_STYLE, fontSize: 9 }} width={120} />
                            <Tooltip content={<RichTooltip suffix="" formatLabel={(v: string) => v} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
                            <Bar
                              dataKey="rupturas" name="Rupturas" fill="url(#gradRuptBar)" radius={[0, 6, 6, 0]}
                              animationDuration={800} animationEasing="ease-out"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Heatmap semanal */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Heatmap Semanal de Rupturas</CardTitle></CardHeader>
                  <CardContent>
                    <HeatmapGrid data={a?.heatmap ?? []} />
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ═══════ TAB: GEOGRAFIA ═══════ */}
          <TabsContent value="geografia">
            {!hasData && !isLoading ? <EmptyState /> : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Treemap UF */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Distribuição por UF</CardTitle></CardHeader>
                    <CardContent className="h-80">
                      {(a?.ufDistribution?.length ?? 0) === 0 ? <EmptyState /> : (
                        <ResponsiveContainer width="100%" height="100%">
                          <Treemap
                            data={(a?.ufDistribution ?? []).slice(0, 15).map((u) => ({ name: u.uf, peso: u.peso, size: u.peso }))}
                            dataKey="size"
                            aspectRatio={4 / 3}
                            content={<TreemapContent />}
                            animationDuration={600}
                            animationEasing="ease-out"
                          />
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  {/* Bar horizontal UFs */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Peso por UF</CardTitle></CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={a?.ufDistribution?.slice(0, 10) ?? []} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="gradUfBar" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className={GRID_STYLE} horizontal={false} />
                          <XAxis type="number" tick={AXIS_STYLE} tickFormatter={fmtYAxis} />
                          <YAxis type="category" dataKey="uf" tick={AXIS_STYLE} width={40} />
                          <Tooltip content={<RichTooltip suffix="kg" formatLabel={(v: string) => v} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
                          <Bar
                            dataKey="peso" name="Peso" fill="url(#gradUfBar)" radius={[0, 6, 6, 0]}
                            animationDuration={800} animationEasing="ease-out"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela UF */}
                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Detalhamento por UF</CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                      if (!a?.ufDistribution) return;
                      exportCsv(
                        ["UF", "Peso (kg)", "Pedidos", "% Part."],
                        a.ufDistribution.map((u) => [u.uf, u.peso, u.pedidos, u.participacao]),
                        "uf_distribuicao.csv"
                      );
                    }}>
                      <Download className="h-3 w-3" /> CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>UF</TableHead>
                          <TableHead className="text-right">Peso (kg)</TableHead>
                          <TableHead className="text-right">Pedidos</TableHead>
                          <TableHead className="text-right">% Part.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(a?.ufDistribution ?? []).map((u) => (
                          <TableRow key={u.uf}>
                            <TableCell className="font-medium">{u.uf}</TableCell>
                            <TableCell className="text-right tabular-nums">{u.peso.toLocaleString("pt-BR")}</TableCell>
                            <TableCell className="text-right tabular-nums">{u.pedidos}</TableCell>
                            <TableCell className="text-right tabular-nums">{u.participacao}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// ── Heatmap Grid Component (improved) ──
function HeatmapGrid({ data }: { data: { week: number; dayOfWeek: number; date: string; taxa: number; rupturas: number; total: number }[] }) {
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const [hoveredCell, setHoveredCell] = useState<{ week: number; day: number } | null>(null);

  if (data.length === 0) return <EmptyState message="Sem dados de ruptura para heatmap" />;

  const weeks = Array.from(new Set(data.map((d) => d.week))).sort((a, b) => a - b);
  const maxTaxa = Math.max(...data.map((d) => d.taxa), 1);

  const getCell = (week: number, day: number) => data.find((d) => d.week === week && d.dayOfWeek === day);

  // Green → Yellow → Red color scale
  function heatColor(intensity: number): string {
    if (intensity === 0) return "hsl(var(--muted)/0.2)";
    if (intensity < 0.33) return `hsl(122, ${30 + intensity * 60}%, ${85 - intensity * 30}%)`;
    if (intensity < 0.66) return `hsl(${45 - (intensity - 0.33) * 80}, 80%, ${75 - intensity * 20}%)`;
    return `hsl(${0}, ${50 + intensity * 30}%, ${80 - intensity * 35}%)`;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <TooltipProvider delayDuration={100}>
          <div className="inline-grid gap-1" style={{ gridTemplateColumns: `40px repeat(${weeks.length}, 32px)` }}>
            {/* Header */}
            <div />
            {weeks.map((w) => (
              <div key={w} className="text-[9px] text-center text-muted-foreground font-medium">S{w}</div>
            ))}
            {/* Rows */}
            {dayLabels.map((label, dayIdx) => (
              <div key={`row-${dayIdx}`} className="contents">
                <div className="text-[10px] text-muted-foreground flex items-center font-medium">{label}</div>
                {weeks.map((w) => {
                  const cell = getCell(w, dayIdx);
                  const intensity = cell ? cell.taxa / maxTaxa : 0;
                  const isHovered = hoveredCell?.week === w && hoveredCell?.day === dayIdx;
                  return (
                    <UITooltip key={`${w}-${dayIdx}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-semibold cursor-default transition-all duration-150 ${isHovered ? "ring-2 ring-foreground/30 scale-110 z-10" : ""}`}
                          style={{
                            backgroundColor: heatColor(intensity),
                            color: intensity > 0.5 ? "hsl(0, 60%, 25%)" : intensity > 0 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                          }}
                          onMouseEnter={() => setHoveredCell({ week: w, day: dayIdx })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {cell?.rupturas || ""}
                        </div>
                      </TooltipTrigger>
                      {cell && (
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-semibold">{fmtDate(cell.date)}</p>
                          <p>{cell.rupturas} rupturas de {cell.total} pedidos</p>
                          <p className="font-bold text-red-500">Taxa: {cell.taxa}%</p>
                        </TooltipContent>
                      )}
                    </UITooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Menos</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((i) => (
          <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: heatColor(i) }} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
}
