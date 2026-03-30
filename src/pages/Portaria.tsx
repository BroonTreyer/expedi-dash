import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Search, Truck, ParkingCircle, History, Download, Upload, X } from "lucide-react";
import { useMovimentacoes, CATEGORIAS, type MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { PortariaKpiCards } from "@/components/portaria/PortariaKpiCards";
import { PatioAtualTab } from "@/components/portaria/PatioAtualTab";
import { HistoricoTab } from "@/components/portaria/HistoricoTab";
import { RegistroMovimentoDialog } from "@/components/portaria/RegistroMovimentoDialog";
import { ImportarPlanilhaDialog, type ParsedRow } from "@/components/portaria/ImportarPlanilhaDialog";
import { MovimentoDetailsDialog } from "@/components/portaria/MovimentoDetailsDialog";
import { VeiculosEsperadosPanel } from "@/components/portaria/VeiculosEsperadosPanel";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

export default function Portaria() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({ from: today, to: today });
  const dateFromStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : format(today, "yyyy-MM-dd");
  const dateToStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : dateFromStr;
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");

  const { data: movimentacoes = [], isLoading } = useMovimentacoes(dateFromStr, dateToStr);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [prefill, setPrefill] = useState<MovimentacaoPortaria | null>(null);
  const [prefillFromPlanilha, setPrefillFromPlanilha] = useState<Record<string, any> | null>(null);
  const [detailsMov, setDetailsMov] = useState<MovimentacaoPortaria | null>(null);
  const [detailsSaida, setDetailsSaida] = useState<MovimentacaoPortaria | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [veiculosEsperados, setVeiculosEsperados] = useState<ParsedRow[]>([]);
  const [placasConferidas, setPlacasConferidas] = useState<Set<string>>(new Set());

  const isToday = dateRange.from?.toDateString() === today.toDateString() && (!dateRange.to || dateRange.to.toDateString() === today.toDateString());
  const dateLabel = isToday ? "Hoje" : "no Período";

  const hasActiveFilters = search || categoriaFilter || tipoFilter;

  const clearFilters = () => {
    setSearch("");
    setCategoriaFilter("");
    setTipoFilter("");
  };

  const counts = useMemo(() => {
    const saidasVinculadas = new Set(
      movimentacoes
        .filter((m) => m.tipo_movimento === "saida" && m.movimento_vinculado_id)
        .map((m) => m.movimento_vinculado_id!)
    );
    const patio = movimentacoes.filter((m) => m.tipo_movimento === "entrada" && !saidasVinculadas.has(m.id) && m.categoria !== "terceirizado").length;
    return { patio, historico: movimentacoes.length };
  }, [movimentacoes]);

  const openRegistro = (prefillData?: MovimentacaoPortaria) => {
    setPrefill(prefillData || null);
    setPrefillFromPlanilha(null);
    setDialogOpen(true);
  };

  const openRegistroFromPlanilha = (row: ParsedRow) => {
    setPrefill(null);
    const isTerceirizado = row.grupo === "FROTAS" || row.grupo === "INTERIOR";
    setPrefillFromPlanilha({
      tipo: "entrada" as const,
      categoria: isTerceirizado ? "terceirizado" : "carga_propria",
      placa: row.placa,
      motorista: row.motorista,
      empresa: row.transportadora || "",
      carga_id: row.carga_id,
      rota: row.destino,
      peso: row.peso,
      qtd_entregas: row.qtd_entregas,
    });
    setDialogOpen(true);
  };

  const handleImportPlanilha = (rows: ParsedRow[]) => {
    setVeiculosEsperados(rows);
    setPlacasConferidas(new Set());
  };

  const handleDialogClose = (v: boolean) => {
    setDialogOpen(v);
    if (!v) {
      setPrefillFromPlanilha(null);
    }
  };

  // Mark placa as conferida when a new entrada is created
  const handleMovimentacaoCreated = (placa: string) => {
    if (veiculosEsperados.length > 0 && placa) {
      const norm = placa.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const match = veiculosEsperados.find((v) => v.placa.replace(/[^A-Z0-9]/gi, "").toUpperCase() === norm);
      if (match) {
        setPlacasConferidas((prev) => new Set([...prev, match.placa]));
      }
    }
  };

  const openDetails = (entrada?: MovimentacaoPortaria, saida?: MovimentacaoPortaria) => {
    setDetailsMov(entrada || saida || null);
    setDetailsSaida(saida || null);
    setDetailsOpen(true);
  };

  const exportCSV = useCallback(() => {
    if (movimentacoes.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    const headers = ["Data/Hora", "Tipo", "Categoria", "Placa", "Motorista", "Empresa", "Setor", "Rota", "KM Inicial", "KM Final", "KM Rodado", "Observações"];
    // Apply active filters before export
    const filtered = movimentacoes.filter((m) => {
      if (categoriaFilter && categoriaFilter !== "all" && m.categoria !== categoriaFilter) return false;
      if (tipoFilter && tipoFilter !== "all" && m.tipo_movimento !== tipoFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          m.placa?.toLowerCase().includes(s) ||
          m.motorista?.toLowerCase().includes(s) ||
          m.empresa?.toLowerCase().includes(s) ||
          m.nome_completo?.toLowerCase().includes(s) ||
          m.documento?.toLowerCase().includes(s) ||
          m.rota?.toLowerCase().includes(s)
        );
      }
      return true;
    });
    if (filtered.length === 0) {
      toast.error("Nenhum dado para exportar com os filtros atuais");
      return;
    }
    const rows = filtered.map((m) => [
      format(new Date(m.data_hora), "dd/MM/yyyy HH:mm"),
      m.tipo_movimento === "entrada" ? "Entrada" : "Retorno",
      CATEGORIAS.find((c) => c.value === m.categoria)?.label || m.categoria,
      m.placa || "",
      m.motorista || m.nome_completo || "",
      m.empresa || "",
      m.destino_setor || "",
      m.rota || "",
      m.km_inicial ?? "",
      m.km_final ?? "",
      m.km_rodado ?? "",
      m.observacoes || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portaria_${dateFromStr}_${dateToStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  }, [movimentacoes, dateFromStr, dateToStr, categoriaFilter, tipoFilter, search]);

  return (
    <Layout>
      <div className="space-y-4 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
                <span className="truncate">Controle de Portaria</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Registro universal de entrada e saída de veículos
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs sm:text-sm justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateRange.from ? (
                    dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (
                      <>{format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} – {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}</>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    "Selecionar datas"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    if (range) setDateRange(range);
                  }}
                  locale={ptBR}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
                <div className="p-2 border-t flex justify-end gap-1">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDateRange({ from: today, to: today })}>Hoje</Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 6); setDateRange({ from: d, to: today }); }}>Últimos 7 dias</Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); setDateRange({ from: new Date(d.getFullYear(), d.getMonth(), 1), to: d }); }}>Este mês</Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button size="sm" className="gap-1.5 text-xs sm:text-sm" onClick={() => openRegistro()}>
              <Plus className="h-3.5 w-3.5" /> Registrar
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs sm:text-sm" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs sm:text-sm" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> Importar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <PortariaKpiCards movimentacoes={movimentacoes} isLoading={isLoading} dateLabel={dateLabel} />

        {/* Veículos Esperados */}
        <VeiculosEsperadosPanel
          veiculos={veiculosEsperados}
          conferidos={placasConferidas}
          onRegistrar={openRegistroFromPlanilha}
          onClear={() => { setVeiculosEsperados([]); setPlacasConferidas(new Set()); }}
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar placa, motorista, empresa, nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground h-9" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="patio">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="patio" className="gap-1 flex-1 sm:flex-initial text-xs sm:text-sm">
              <ParkingCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Pátio
              {counts.patio > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">{counts.patio}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1 flex-1 sm:flex-initial text-xs sm:text-sm">
              <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Histórico
              {counts.historico > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">{counts.historico}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patio">
            <Card>
              <CardHeader className="py-3 px-4 hidden sm:block">
                <CardTitle className="text-base">Veículos no Pátio</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PatioAtualTab
                  movimentacoes={movimentacoes}
                  search={search}
                  categoriaFilter={categoriaFilter === "all" ? "" : categoriaFilter}
                  onRegistrarSaida={(entrada) => openRegistro(entrada)}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico">
            <Card>
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm sm:text-base">Todos os Movimentos</CardTitle>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                     <SelectItem value="all">Todos</SelectItem>
                     <SelectItem value="entrada">Entradas</SelectItem>
                     <SelectItem value="saida">Retornos</SelectItem>
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
                  isLoading={isLoading}
                  isMultiDay={dateFromStr !== dateToStr}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <RegistroMovimentoDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        prefill={prefill}
        prefillFromPlanilha={prefillFromPlanilha}
        onCreated={handleMovimentacaoCreated}
      />
      <MovimentoDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} movimento={detailsMov} movimentoSaida={detailsSaida} />
      <ImportarPlanilhaDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} onImport={handleImportPlanilha} />
    </Layout>
  );
}
