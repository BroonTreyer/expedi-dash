import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Search, Truck, ParkingCircle, History } from "lucide-react";
import { useMovimentacoes, CATEGORIAS, type MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { PortariaKpiCards } from "@/components/portaria/PortariaKpiCards";
import { PatioAtualTab } from "@/components/portaria/PatioAtualTab";
import { HistoricoTab } from "@/components/portaria/HistoricoTab";
import { RegistroMovimentoDialog } from "@/components/portaria/RegistroMovimentoDialog";
import { MovimentoDetailsDialog } from "@/components/portaria/MovimentoDetailsDialog";

export default function Portaria() {
  const [date, setDate] = useState<Date>(new Date());
  const dateStr = format(date, "yyyy-MM-dd");
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");

  const { data: movimentacoes = [], isLoading } = useMovimentacoes(dateStr);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prefill, setPrefill] = useState<MovimentacaoPortaria | null>(null);

  // Details dialog
  const [detailsMov, setDetailsMov] = useState<MovimentacaoPortaria | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openRegistro = (prefillData?: MovimentacaoPortaria) => {
    setPrefill(prefillData || null);
    setDialogOpen(true);
  };

  const openDetails = (mov: MovimentacaoPortaria) => {
    setDetailsMov(mov);
    setDetailsOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-4 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              Controle de Portaria
            </h1>
            <p className="text-sm text-muted-foreground">
              Registro universal de entrada e saída de veículos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(date, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} locale={ptBR} />
              </PopoverContent>
            </Popover>
            <Button className="gap-2" onClick={() => openRegistro()}>
              <Plus className="h-4 w-4" /> Registrar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <PortariaKpiCards movimentacoes={movimentacoes} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar placa, motorista, empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="patio">
          <TabsList>
            <TabsTrigger value="patio" className="gap-1.5">
              <ParkingCircle className="h-4 w-4" /> Pátio Atual
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5">
              <History className="h-4 w-4" /> Histórico do Dia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patio">
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base">Veículos no Pátio</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PatioAtualTab
                  movimentacoes={movimentacoes}
                  search={search}
                  categoriaFilter={categoriaFilter === "all" ? "" : categoriaFilter}
                  onRegistrarSaida={(entrada) => openRegistro(entrada)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico">
            <Card>
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Todos os Movimentos</CardTitle>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="saida">Saídas</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                <HistoricoTab
                  movimentacoes={movimentacoes}
                  search={search}
                  categoriaFilter={categoriaFilter === "all" ? "" : categoriaFilter}
                  tipoFilter={tipoFilter === "all" ? "" : tipoFilter}
                  onViewDetails={openDetails}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <RegistroMovimentoDialog open={dialogOpen} onOpenChange={setDialogOpen} prefill={prefill} />
      <MovimentoDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} movimento={detailsMov} />
    </Layout>
  );
}
