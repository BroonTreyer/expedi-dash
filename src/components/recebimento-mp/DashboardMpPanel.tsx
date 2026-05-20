import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Truck, DollarSign, ClipboardList, PackageOpen } from "lucide-react";
import { useRecebimentosMpDashboard, type DashboardRangePreset } from "@/hooks/useRecebimentosMpDashboard";
import { formatarBRL } from "@/lib/peso-mp";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export function DashboardMpPanel() {
  const [preset, setPreset] = useState<DashboardRangePreset>("30");
  const { data, isLoading } = useRecebimentosMpDashboard(preset);

  if (isLoading || !data) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground uppercase">Período</span>
        <Select value={preset} onValueChange={(v) => setPreset(v as DashboardRangePreset)}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kpi label="Descargas" value={data.totalDescargas} icon={ClipboardList} />
        <Kpi label="Toneladas" value={data.totalTon.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} icon={Truck} />
        <Kpi label="Valor total" value={formatarBRL(data.totalValor)} icon={DollarSign} />
        <Kpi label="Pago" value={formatarBRL(data.valorPago)} icon={DollarSign} />
        <Kpi label="Pendente" value={formatarBRL(data.valorPendente)} icon={DollarSign} />
        <Kpi label="Pallets a devolver" value={data.palletsPendentes} icon={PackageOpen} />
      </div>

      <Card><CardContent className="p-4">
        <div className="text-sm font-semibold mb-2">Toneladas por dia</div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={data.serieDiaria}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 3 })} />
              <Bar dataKey="ton" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-sm font-semibold mb-2">Top 5 fornecedores (ton)</div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={data.topFornecedores} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="ton" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="text-sm font-semibold mb-2">Top 5 motoristas (entregas)</div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={data.topMotoristas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="entregas" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="text-sm font-semibold mb-2">Status de pagamento</div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: "Pago", value: data.pagamentoStatus.pago },
                    { name: "Pendente", value: data.pagamentoStatus.pendente },
                  ]}
                  dataKey="value" nameKey="name" outerRadius={80} label
                >
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--muted-foreground))" />
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-lg font-bold tabular-nums mt-1">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    </CardContent></Card>
  );
}