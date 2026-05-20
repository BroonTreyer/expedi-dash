import { Layout } from "@/components/Layout";
import { PackageOpen, ClipboardList, History, BarChart3, Contact, Building2, Boxes } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { OperacaoDiaPanel } from "@/components/recebimento-mp/OperacaoDiaPanel";
import { HistoricoDescargasPanel } from "@/components/recebimento-mp/HistoricoDescargasPanel";
import { DashboardMpPanel } from "@/components/recebimento-mp/DashboardMpPanel";
import { MotoristasMpPanel } from "@/components/recebimento-mp/MotoristasMpPanel";
import { FornecedoresMpPanel } from "@/components/recebimento-mp/FornecedoresMpPanel";
import { ProdutosMpPanel } from "@/components/recebimento-mp/ProdutosMpPanel";

const TABS = [
  { value: "operacao", label: "Operação", icon: ClipboardList },
  { value: "historico", label: "Histórico", icon: History },
  { value: "dashboard", label: "Dashboard", icon: BarChart3 },
  { value: "motoristas", label: "Motoristas", icon: Contact },
  { value: "fornecedores", label: "Fornecedores", icon: Building2 },
  { value: "produtos", label: "Produtos", icon: Boxes },
];

export default function RecebimentoMpPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "operacao";
  const setTab = (v: string) => { params.set("tab", v); setParams(params, { replace: true }); };

  return (
    <Layout>
      <main className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto w-full">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><PackageOpen className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recebimento de Matéria Prima</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Operação do dia, histórico, dashboard, motoristas, fornecedores e produtos.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-2">
                <t.icon className="h-4 w-4" /> <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="operacao" className="mt-4"><OperacaoDiaPanel /></TabsContent>
          <TabsContent value="historico" className="mt-4"><HistoricoDescargasPanel /></TabsContent>
          <TabsContent value="dashboard" className="mt-4"><DashboardMpPanel /></TabsContent>
          <TabsContent value="motoristas" className="mt-4"><MotoristasMpPanel /></TabsContent>
          <TabsContent value="fornecedores" className="mt-4"><FornecedoresMpPanel /></TabsContent>
          <TabsContent value="produtos" className="mt-4"><ProdutosMpPanel /></TabsContent>
        </Tabs>
      </main>
    </Layout>
  );
}
