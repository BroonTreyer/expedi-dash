import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Contact } from "lucide-react";
import { useMotoristasPainel, type MotoristaAgg } from "@/hooks/useMotoristasPainel";
import { MotoristaKpis } from "@/components/motoristas/MotoristaKpis";
import { MotoristaRankingTable } from "@/components/motoristas/MotoristaRankingTable";
import { MotoristaDetalheDrawer } from "@/components/motoristas/MotoristaDetalheDrawer";
import { EmRotaAgoraPanel } from "@/components/motoristas/EmRotaAgoraPanel";

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

const PRESETS: { value: string; label: string; days: number }[] = [
  { value: "1", label: "Hoje", days: 0 },
  { value: "7", label: "Últimos 7 dias", days: 6 },
  { value: "30", label: "Últimos 30 dias", days: 29 },
  { value: "90", label: "Últimos 90 dias", days: 89 },
  { value: "custom", label: "Personalizado", days: -1 },
];

export default function MotoristasPainel() {
  const [preset, setPreset] = useState("7");
  const today = useMemo(() => isoDate(new Date()), []);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return isoDate(d);
  });
  const [endDate, setEndDate] = useState(today);
  const [categoria, setCategoria] = useState<"todos" | "carga_propria" | "terceirizado">("todos");
  const [selecionado, setSelecionado] = useState<MotoristaAgg | null>(null);

  const handlePreset = (v: string) => {
    setPreset(v);
    const cfg = PRESETS.find((p) => p.value === v);
    if (!cfg || cfg.days < 0) return;
    const d = new Date(); d.setDate(d.getDate() - cfg.days);
    setStartDate(isoDate(d));
    setEndDate(today);
  };

  const { data = [], isLoading } = useMotoristasPainel({ startDate, endDate, categoria });

  return (
    <Layout>
      <div className="p-3 md:p-5 space-y-4 max-w-[1600px] mx-auto">
        <header className="flex items-center gap-2">
          <Contact className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Painel de Motoristas</h1>
        </header>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-1">Período</label>
            <Select value={preset} onValueChange={handlePreset}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-1">De</label>
            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPreset("custom"); }} className="w-40 h-9" />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-1">Até</label>
            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPreset("custom"); }} className="w-40 h-9" />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-1">Tipo</label>
            <Select value={categoria} onValueChange={(v) => setCategoria(v as typeof categoria)}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="carga_propria">Varejo</SelectItem>
                <SelectItem value="terceirizado">Distribuidores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <MotoristaKpis data={data} />

            <Tabs defaultValue="ranking">
              <TabsList>
                <TabsTrigger value="ranking">Ranking de Motoristas</TabsTrigger>
                <TabsTrigger value="em_rota">Em Rota Agora</TabsTrigger>
              </TabsList>
              <TabsContent value="ranking" className="mt-4">
                <MotoristaRankingTable data={data} onSelect={setSelecionado} />
              </TabsContent>
              <TabsContent value="em_rota" className="mt-4">
                <EmRotaAgoraPanel data={data} onSelect={setSelecionado} />
              </TabsContent>
            </Tabs>
          </>
        )}

        <MotoristaDetalheDrawer
          motorista={selecionado}
          onClose={() => setSelecionado(null)}
          periodo={{ inicio: startDate, fim: endDate }}
        />
      </div>
    </Layout>
  );
}
