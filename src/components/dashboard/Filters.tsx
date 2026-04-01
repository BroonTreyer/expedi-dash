import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, CalendarIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/hooks/useAuth";
import type { DateRange } from "react-day-picker";

interface CarregamentoData {
  vendedor_id?: string | null;
  codigo_cliente?: string | null;
  cliente?: string | null;
  uf?: string | null;
  tipo_caminhao?: string | null;
  ruptura?: boolean;
}

interface Props {
  filters: {
    status: string;
    vendedor: string[];
    tipoCaminhao: string;
    busca: string;
    dateRange: DateRange;
    etapa: string;
    ruptura: string;
    cliente: string[];
    uf: string;
  };
  onChange: (f: Props["filters"]) => void;
  vendedores: { id: string; nome_vendedor: string }[];
  tiposCaminhao: { id: string; nome_tipo: string }[];
  clientes?: { codigo_cliente: string; nome_cliente: string }[];
  userRole?: AppRole | null;
  /** Raw data for dynamic filter options */
  carregamentos?: CarregamentoData[];
}

const DEFAULT_FILTERS = {
  status: "todos",
  vendedor: [] as string[],
  tipoCaminhao: "todos",
  busca: "",
  etapa: "todos",
  ruptura: "todos",
  cliente: [] as string[],
  uf: "todos",
};

export function Filters({ filters, onChange, vendedores, tiposCaminhao, clientes = [], userRole, carregamentos = [] }: Props) {
  const set = (key: string, value: any) => onChange({ ...filters, [key]: value });
  const isLogistica = userRole === "logistica";
  const today = new Date();

  // Count active filters (excluding dateRange which is always set)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "todos") count++;
    if (filters.vendedor.length > 0) count++;
    if (filters.tipoCaminhao !== "todos") count++;
    if (filters.busca !== "") count++;
    if (filters.etapa !== "todos") count++;
    if (filters.ruptura !== "todos") count++;
    if (filters.cliente.length > 0) count++;
    if (filters.uf !== "todos") count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    onChange({ ...filters, ...DEFAULT_FILTERS });
  };

  // ── Date range picker ──
  const DateNav = (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9 gap-1.5 text-xs sm:text-sm justify-start text-left font-normal min-w-[140px]", !filters.dateRange.from && "text-muted-foreground")}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {filters.dateRange.from ? (
            filters.dateRange.to && filters.dateRange.from.getTime() !== filters.dateRange.to.getTime() ? (
              <>{format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })} – {format(filters.dateRange.to, "dd/MM/yyyy", { locale: ptBR })}</>
            ) : (
              format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })
            )
          ) : (
            "Selecionar datas"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={filters.dateRange} onSelect={(range) => { if (range) set("dateRange", range); }} locale={ptBR} numberOfMonths={2} className={cn("p-3 pointer-events-auto")} />
        <div className="p-2 border-t flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => set("dateRange", { from: today, to: today })}>Hoje</Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 6); set("dateRange", { from: d, to: today }); }}>Últimos 7 dias</Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { const d = new Date(); set("dateRange", { from: new Date(d.getFullYear(), d.getMonth(), 1), to: d }); }}>Este mês</Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  // ── Clear filters button ──
  const ClearButton = activeFilterCount > 0 && (
    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={clearFilters}>
      <X className="h-3.5 w-3.5" />
      Limpar filtros
      <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] leading-none">
        {activeFilterCount}
      </Badge>
    </Button>
  );

  // ── Cascading filter logic ──
  const afterVendedor = useMemo(() => {
    if (filters.vendedor.length === 0) return carregamentos;
    const s = new Set(filters.vendedor);
    return carregamentos.filter(c => s.has(c.vendedor_id ?? ""));
  }, [carregamentos, filters.vendedor]);

  const afterCliente = useMemo(() => {
    if (filters.cliente.length === 0) return afterVendedor;
    const s = new Set(filters.cliente);
    return afterVendedor.filter(c => s.has(c.codigo_cliente ?? ""));
  }, [afterVendedor, filters.cliente]);

  const afterUf = useMemo(() => {
    if (filters.uf === "todos") return afterCliente;
    return afterCliente.filter(c => c.uf === filters.uf);
  }, [afterCliente, filters.uf]);

  const vendedorOptions = useMemo(() => {
    const ids = new Set(carregamentos.map(c => c.vendedor_id).filter(Boolean));
    return vendedores.filter(v => ids.has(v.id));
  }, [carregamentos, vendedores]);

  const clienteOptions = useMemo(() => {
    const codes = new Set(afterVendedor.map(c => c.codigo_cliente).filter(Boolean));
    return clientes.filter(c => codes.has(c.codigo_cliente));
  }, [afterVendedor, clientes]);

  const ufOptions = useMemo(() => {
    const ufs = [...new Set(afterCliente.map(c => c.uf).filter(Boolean) as string[])];
    return ufs.sort();
  }, [afterCliente]);

  const tipoCaminhaoOptions = useMemo(() => {
    const types = new Set(afterUf.map(c => c.tipo_caminhao).filter(Boolean));
    return tiposCaminhao.filter(t => types.has(t.nome_tipo));
  }, [afterUf, tiposCaminhao]);

  if (isLogistica) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {DateNav}
        <MultiSelectFilter
          options={vendedorOptions.map((v) => ({ value: v.id, label: v.nome_vendedor }))}
          selected={filters.vendedor}
          onChange={(v) => set("vendedor", v)}
          placeholder="Todos Vendedores"
          className="w-[180px]"
        />
        <MultiSelectFilter
          options={clienteOptions.map((c) => ({ value: c.codigo_cliente, label: `${c.codigo_cliente} – ${c.nome_cliente}` }))}
          selected={filters.cliente}
          onChange={(v) => set("cliente", v)}
          placeholder="Todos Clientes"
          className="w-[200px]"
        />
        <Select value={filters.uf} onValueChange={(v) => set("uf", v)}>
          <SelectTrigger className="h-9 text-sm w-[120px]">
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas UFs</SelectItem>
            {ufOptions.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>
        {ClearButton}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap lg:flex-nowrap items-center gap-2 [&>*]:min-w-0">
      {DateNav}
      <MultiSelectFilter
        options={vendedorOptions.map((v) => ({ value: v.id, label: v.nome_vendedor }))}
        selected={filters.vendedor}
        onChange={(v) => set("vendedor", v)}
        placeholder="Todos Vendedores"
        className="md:w-[150px]"
      />
      <MultiSelectFilter
        options={clienteOptions.map((c) => ({ value: c.codigo_cliente, label: `${c.codigo_cliente} – ${c.nome_cliente}` }))}
        selected={filters.cliente}
        onChange={(v) => set("cliente", v)}
        placeholder="Todos Clientes"
        className="md:w-[180px]"
      />
      <Select value={filters.uf} onValueChange={(v) => set("uf", v)}>
        <SelectTrigger className="h-9 text-sm md:w-[100px]">
          <SelectValue placeholder="UF" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas UFs</SelectItem>
          {ufOptions.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.tipoCaminhao} onValueChange={(v) => set("tipoCaminhao", v)}>
        <SelectTrigger className="h-9 text-sm md:w-[150px]">
          <SelectValue placeholder="Tipo Caminhão" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos Tipos</SelectItem>
          {tipoCaminhaoOptions.map((t) => <SelectItem key={t.id} value={t.nome_tipo}>{t.nome_tipo}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.ruptura} onValueChange={(v) => set("ruptura", v)}>
        <SelectTrigger className="h-9 text-sm md:w-[140px]">
          <SelectValue placeholder="Ruptura" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas</SelectItem>
          <SelectItem value="sim">Com Ruptura</SelectItem>
          <SelectItem value="nao">Sem Ruptura</SelectItem>
        </SelectContent>
      </Select>
      <div className="relative col-span-2 sm:col-span-1 md:flex-1 md:min-w-[130px] md:max-w-[180px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={filters.busca}
          onChange={(e) => set("busca", e.target.value)}
          className="h-9 pl-8 text-sm w-full"
        />
      </div>
      {ClearButton}
    </div>
  );
}
