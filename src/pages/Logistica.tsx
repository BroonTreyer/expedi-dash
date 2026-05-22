import { useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, FileText, DollarSign, BarChart3, Wallet } from "lucide-react";
import { TabelaFreteTab } from "@/components/logistica/TabelaFreteTab";
import { CtesDacteTab } from "@/components/logistica/CtesDacteTab";
import { GastosVendedorTab } from "@/components/logistica/GastosVendedorTab";
import { AdiantamentosTab } from "@/components/logistica/AdiantamentosTab";
import { useCtesDacte } from "@/hooks/useCtesDacte";

function VisaoGeralTab() {
  const { data: ctes } = useCtesDacte();

  const kpis = useMemo(() => {
    const list = ctes ?? [];
    const total = list.reduce((s, c) => s + Number(c.valor_frete || 0), 0);
    const totalPeso = list.reduce((s, c) => s + Number(c.peso_total || 0), 0);
    const rkg = totalPeso > 0 ? total / totalPeso : 0;
    const destinos = new Map<string, number>();
    list.forEach((c) => {
      const k = `${c.destino_cidade ?? "—"}/${c.destino_uf ?? "—"}`;
      destinos.set(k, (destinos.get(k) ?? 0) + Number(c.valor_frete || 0));
    });
    const top5 = [...destinos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { total, ctesCount: list.length, rkg, top5 };
  }, [ctes]);

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Fretes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(kpis.total)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">CT-es</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.ctesCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">R$/kg médio</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(kpis.rkg)}</div></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Top 5 Destinos por Frete</CardTitle></CardHeader>
        <CardContent>
          {kpis.top5.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum CT-e cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {kpis.top5.map(([dest, val]) => {
                const pct = (val / kpis.top5[0][1]) * 100;
                return (
                  <div key={dest}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{dest}</span>
                      <span className="text-muted-foreground">{fmt(val)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Logistica() {
  return (
    <Layout>
      <main className="p-4 md:p-6 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Logística</h1>
          <p className="text-sm text-muted-foreground">Gestão de fretes, CT-es e gastos por vendedor</p>
        </div>
        <Tabs defaultValue="visao" className="space-y-4">
          <TabsList>
            <TabsTrigger value="visao"><BarChart3 className="h-4 w-4 mr-2" />Visão Geral</TabsTrigger>
            <TabsTrigger value="tabela"><Truck className="h-4 w-4 mr-2" />Tabela de Frete</TabsTrigger>
            <TabsTrigger value="ctes"><FileText className="h-4 w-4 mr-2" />CT-es / DACTE</TabsTrigger>
            <TabsTrigger value="adiantamentos"><Wallet className="h-4 w-4 mr-2" />Adiantamentos</TabsTrigger>
            <TabsTrigger value="gastos"><DollarSign className="h-4 w-4 mr-2" />Gastos por Vendedor</TabsTrigger>
          </TabsList>
          <TabsContent value="visao"><VisaoGeralTab /></TabsContent>
          <TabsContent value="tabela"><TabelaFreteTab /></TabsContent>
          <TabsContent value="ctes"><CtesDacteTab /></TabsContent>
          <TabsContent value="adiantamentos"><AdiantamentosTab /></TabsContent>
          <TabsContent value="gastos"><GastosVendedorTab /></TabsContent>
        </Tabs>
      </main>
    </Layout>
  );
}
