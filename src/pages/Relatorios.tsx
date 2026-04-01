import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileText, TrendingUp, Clock, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  gerarResumoDiario,
  gerarRelatorioRupturas,
  gerarPerformanceVendedores,
  gerarTempoMedioPatio,
} from "@/hooks/useRelatorios";

const today = new Date();
const presets = [
  { label: "Últimos 7 dias", start: format(subDays(today, 7), "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") },
  { label: "Últimos 15 dias", start: format(subDays(today, 15), "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") },
  { label: "Últimos 30 dias", start: format(subDays(today, 30), "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") },
  { label: "Mês atual", start: format(startOfMonth(today), "yyyy-MM-dd"), end: format(endOfMonth(today), "yyyy-MM-dd") },
  { label: "Mês anterior", start: format(startOfMonth(subMonths(today, 1)), "yyyy-MM-dd"), end: format(endOfMonth(subMonths(today, 1)), "yyyy-MM-dd") },
];

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  fn: (start: string, end: string) => Promise<void>;
}

const reports: ReportCard[] = [
  {
    id: "resumo",
    title: "Resumo Diário de Expedição",
    description: "Cargas expedidas com peso total, pedidos, clientes e destinos agrupados por carga.",
    icon: FileSpreadsheet,
    color: "text-blue-600 dark:text-blue-400",
    fn: gerarResumoDiario,
  },
  {
    id: "rupturas",
    title: "Relatório de Rupturas",
    description: "Lista de rupturas com produto, cliente, vendedor e taxa de ruptura do período.",
    icon: FileText,
    color: "text-red-600 dark:text-red-400",
    fn: gerarRelatorioRupturas,
  },
  {
    id: "vendedores",
    title: "Performance por Vendedor",
    description: "Ranking de vendedores por volume, quantidade de pedidos, cargas e taxa de ruptura.",
    icon: TrendingUp,
    color: "text-green-600 dark:text-green-400",
    fn: gerarPerformanceVendedores,
  },
  {
    id: "patio",
    title: "Tempo Médio de Pátio",
    description: "Tempo médio de permanência no pátio por transportadora com quantidade de veículos.",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    fn: gerarTempoMedioPatio,
  },
];

export default function Relatorios() {
  const [dataInicio, setDataInicio] = useState(presets[0].start);
  const [dataFim, setDataFim] = useState(presets[0].end);
  const [loading, setLoading] = useState<string | null>(null);

  const handleGenerate = async (report: ReportCard) => {
    setLoading(report.id);
    try {
      await report.fn(dataInicio, dataFim);
      toast.success(`${report.title} gerado com sucesso`);
    } catch (e: any) {
      toast.error(`Erro ao gerar: ${e.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Gere relatórios em Excel para análise e compartilhamento</p>
        </div>

        {/* Period selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex gap-3">
                <div>
                  <Label className="text-xs">Data Início</Label>
                  <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-9 w-40" />
                </div>
                <div>
                  <Label className="text-xs">Data Fim</Label>
                  <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9 w-40" />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {presets.map((p) => (
                  <Badge
                    key={p.label}
                    variant={dataInicio === p.start && dataFim === p.end ? "default" : "outline"}
                    className="cursor-pointer text-[10px] hover:bg-accent"
                    onClick={() => { setDataInicio(p.start); setDataFim(p.end); }}
                  >
                    {p.label}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${report.color}`}>
                    <report.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{report.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  className="w-full"
                  variant="outline"
                  size="sm"
                  disabled={loading !== null}
                  onClick={() => handleGenerate(report)}
                >
                  {loading === report.id ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" /> Gerar Excel</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
