import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { format } from "date-fns";

interface Props { carregamentos: any[]; }

const COLORS = {
  primary: "#1E3A8A",  // Marinho
  emerald: "#10B981",
  amber: "#F59E0B",
  violet: "#8B5CF6",
};

export function GraficosVendedor({ carregamentos }: Props) {
  // Evolução diária (peso por dia)
  const evolucao = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of carregamentos) {
      map.set(c.data, (map.get(c.data) ?? 0) + Number(c.peso ?? 0));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([d, peso]) => ({ dia: format(new Date(d + "T00:00:00"), "dd/MM"), peso: Math.round(peso) }));
  }, [carregamentos]);

  // Top 10 clientes
  const topClientes = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of carregamentos) {
      const k = c.cliente ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(c.peso ?? 0));
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nome, peso]) => ({ nome: nome.length > 22 ? nome.slice(0, 22) + "…" : nome, peso: Math.round(peso) }));
  }, [carregamentos]);

  // Top 10 produtos
  const topProdutos = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of carregamentos) {
      const k = c.nome_produto ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(c.peso ?? 0));
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nome, peso]) => ({ nome: nome.length > 22 ? nome.slice(0, 22) + "…" : nome, peso: Math.round(peso) }));
  }, [carregamentos]);

  // Distribuição por UF
  const porUf = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of carregamentos) {
      const k = c.uf ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(c.peso ?? 0));
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([uf, peso]) => ({ uf, peso: Math.round(peso) }));
  }, [carregamentos]);

  const empty = carregamentos.length === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução diária (kg)</CardTitle></CardHeader>
        <CardContent className="h-56">
          {empty ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucao} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => `${v.toLocaleString("pt-BR")} kg`} />
                <Line type="monotone" dataKey="peso" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 clientes (kg)</CardTitle></CardHeader>
        <CardContent className="h-56">
          {empty ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topClientes} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v: any) => `${v.toLocaleString("pt-BR")} kg`} />
                <Bar dataKey="peso" fill={COLORS.emerald} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 produtos (kg)</CardTitle></CardHeader>
        <CardContent className="h-56">
          {empty ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProdutos} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v: any) => `${v.toLocaleString("pt-BR")} kg`} />
                <Bar dataKey="peso" fill={COLORS.amber} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por UF (kg)</CardTitle></CardHeader>
        <CardContent className="h-56">
          {empty ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porUf} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="uf" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => `${v.toLocaleString("pt-BR")} kg`} />
                <Bar dataKey="peso" fill={COLORS.violet} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Empty() {
  return <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados no período</div>;
}