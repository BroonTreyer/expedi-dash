import { useState, useMemo } from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Weight, Package, AlertTriangle, TrendingUp, Calendar, BarChart3 } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from "recharts";
import { useAnalytics } from "@/hooks/useAnalytics";

const PERIOD_OPTIONS = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "15d", label: "Últimos 15 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "mes_atual", label: "Mês atual" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "90d", label: "Últimos 90 dias" },
];

const PIE_COLORS = [
  "hsl(358, 76%, 48%)", "hsl(215, 80%, 55%)", "hsl(122, 39%, 49%)",
  "hsl(45, 93%, 47%)", "hsl(280, 60%, 55%)", "hsl(190, 70%, 45%)",
  "hsl(30, 80%, 55%)", "hsl(330, 60%, 50%)", "hsl(160, 50%, 45%)",
  "hsl(0, 0%, 60%)",
];

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

function formatDateTick(dateStr: string) {
  try { return format(new Date(dateStr + "T12:00:00"), "dd/MM", { locale: ptBR }); }
  catch { return dateStr; }
}

function CustomTooltipPeso({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium mb-1">{formatDateTick(label)}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString("pt-BR")} kg
        </p>
      ))}
    </div>
  );
}

function CustomTooltipRuptura({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium mb-1">{formatDateTick(label)}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.name === "Taxa %" ? `${p.value}%` : p.value}
        </p>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState("30d");
  const range = useMemo(() => getDateRange(period), [period]);
  const { analytics, isLoading } = useAnalytics({ dateFrom: range.from, dateTo: range.to });

  const { kpis, dailyWeight, vendedorRanking, ufDistribution, rupturaDaily } = analytics ?? {
    kpis: { totalPeso: 0, totalPedidos: 0, totalRupturas: 0, totalCarregado: 0, diasUnicos: 0, mediaDiaria: 0 },
    dailyWeight: [], vendedorRanking: [], ufDistribution: [], rupturaDaily: [],
  };

  const kpiCards = [
    { label: "Peso Total", value: `${kpis.totalPeso.toLocaleString("pt-BR")} kg`, icon: Weight, color: "text-foreground" },
    { label: "Total Pedidos", value: kpis.totalPedidos.toLocaleString("pt-BR"), icon: Package, color: "text-primary" },
    { label: "Rupturas", value: kpis.totalRupturas.toLocaleString("pt-BR"), icon: AlertTriangle, color: "text-amber-500" },
    { label: "Média Diária", value: `${kpis.mediaDiaria.toLocaleString("pt-BR")} kg`, icon: TrendingUp, color: "text-accent" },
    { label: "Dias no Período", value: kpis.diasUnicos, icon: Calendar, color: "text-blue-500" },
    { label: "Peso Carregado", value: `${kpis.totalCarregado.toLocaleString("pt-BR")} kg`, icon: BarChart3, color: "text-status-carregado" },
  ];

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground">Visão histórica e tendências de expedição</p>
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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
          {kpiCards.map((c) => (
            <Card key={c.label} className="border-border/60">
              <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</span>
                  <c.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${c.color}`} />
                </div>
                <span className="text-base sm:text-xl font-bold tracking-tight truncate">
                  {isLoading ? "..." : c.value}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Peso diário */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Peso Expedido por Dia</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyWeight} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="date" tickFormatter={formatDateTick} className="text-[10px]" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-[10px]" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}t`} />
                  <Tooltip content={<CustomTooltipPeso />} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area type="monotone" dataKey="peso" name="Peso Total" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.15)" strokeWidth={2} />
                  <Area type="monotone" dataKey="carregado" name="Carregado" stroke="hsl(var(--accent))" fill="hsl(var(--accent)/0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ranking vendedores */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top 10 Vendedores (Peso)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendedorRanking} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis type="number" className="text-[10px]" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}t`} />
                  <YAxis type="category" dataKey="nome" className="text-[10px]" tick={{ fill: "hsl(var(--muted-foreground))" }} width={100} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString("pt-BR")} kg`, "Peso"]} />
                  <Bar dataKey="peso" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Taxa de ruptura */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Taxa de Ruptura (%)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rupturaDaily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="date" tickFormatter={formatDateTick} className="text-[10px]" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-[10px]" tick={{ fill: "hsl(var(--muted-foreground))" }} unit="%" />
                  <Tooltip content={<CustomTooltipRuptura />} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="taxa" name="Taxa %" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="rupturas" name="Rupturas" stroke="hsl(45, 93%, 47%)" strokeWidth={1.5} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribuição por UF */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Distribuição por UF</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ufDistribution.slice(0, 10)}
                    dataKey="peso"
                    nameKey="uf"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    label={({ uf, percent }) => `${uf} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {ufDistribution.slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString("pt-BR")} kg`, "Peso"]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
