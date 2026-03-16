import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import type { AppRole } from "@/hooks/useAuth";

interface CarregamentoData {
  vendedor_id?: string | null;
  codigo_cliente?: string | null;
  cliente?: string | null;
  uf?: string | null;
}

interface Props {
  filters: {
    status: string;
    vendedor: string;
    tipoCaminhao: string;
    busca: string;
    data: string;
    etapa: string;
    ruptura: string;
    cliente: string;
    uf: string;
  };
  onChange: (f: Props["filters"]) => void;
  vendedores: { id: string; nome_vendedor: string }[];
  tiposCaminhao: { id: string; nome_tipo: string }[];
  clientes?: { id: string; codigo_cliente: string; nome_cliente: string }[];
  userRole?: AppRole | null;
  /** Raw data for dynamic filter options */
  carregamentos?: CarregamentoData[];
}

export function Filters({ filters, onChange, vendedores, tiposCaminhao, clientes = [], userRole, carregamentos = [] }: Props) {
  const set = (key: string, value: string) => onChange({ ...filters, [key]: value });
  const isLogistica = userRole === "logistica";

  // Derive dynamic options from actual data
  const activeVendedorIds = useMemo(() => new Set(carregamentos.map(c => c.vendedor_id).filter(Boolean)), [carregamentos]);
  const activeClienteCodes = useMemo(() => new Set(carregamentos.map(c => c.codigo_cliente).filter(Boolean)), [carregamentos]);
  const activeUfs = useMemo(() => {
    const ufs = [...new Set(carregamentos.map(c => c.uf).filter(Boolean) as string[])];
    return ufs.sort();
  }, [carregamentos]);

  const filteredVendedores = useMemo(() => vendedores.filter(v => activeVendedorIds.has(v.id)), [vendedores, activeVendedorIds]);
  const filteredClientes = useMemo(() => clientes.filter(c => activeClienteCodes.has(c.codigo_cliente)), [clientes, activeClienteCodes]);

  if (isLogistica) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.vendedor} onValueChange={(v) => set("vendedor", v)}>
          <SelectTrigger className="h-9 text-sm w-[180px]">
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Vendedores</SelectItem>
            {filteredVendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome_vendedor}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.cliente} onValueChange={(v) => set("cliente", v)}>
          <SelectTrigger className="h-9 text-sm w-[200px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Clientes</SelectItem>
            {filteredClientes.map((c) => <SelectItem key={c.id} value={c.codigo_cliente}>{c.codigo_cliente} – {c.nome_cliente}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.uf} onValueChange={(v) => set("uf", v)}>
          <SelectTrigger className="h-9 text-sm w-[120px]">
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas UFs</SelectItem>
            {activeUfs.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap lg:flex-nowrap items-center gap-2">
      <Input
        type="date"
        value={filters.data}
        onChange={(e) => set("data", e.target.value)}
        className="h-9 text-sm col-span-2 sm:col-span-1 md:w-[140px]"
      />
      <Select value={filters.vendedor} onValueChange={(v) => set("vendedor", v)}>
        <SelectTrigger className="h-9 text-sm md:w-[150px]">
          <SelectValue placeholder="Vendedor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos Vendedores</SelectItem>
          {filteredVendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome_vendedor}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.cliente} onValueChange={(v) => set("cliente", v)}>
        <SelectTrigger className="h-9 text-sm md:w-[180px]">
          <SelectValue placeholder="Cliente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos Clientes</SelectItem>
          {filteredClientes.map((c) => <SelectItem key={c.id} value={c.codigo_cliente}>{c.codigo_cliente} – {c.nome_cliente}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.uf} onValueChange={(v) => set("uf", v)}>
        <SelectTrigger className="h-9 text-sm md:w-[100px]">
          <SelectValue placeholder="UF" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas UFs</SelectItem>
          {activeUfs.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.tipoCaminhao} onValueChange={(v) => set("tipoCaminhao", v)}>
        <SelectTrigger className="h-9 text-sm md:w-[150px]">
          <SelectValue placeholder="Tipo Caminhão" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos Tipos</SelectItem>
          {tiposCaminhao.map((t) => <SelectItem key={t.id} value={t.nome_tipo}>{t.nome_tipo}</SelectItem>)}
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
          placeholder="Buscar produto..."
          value={filters.busca}
          onChange={(e) => set("busca", e.target.value)}
          className="h-9 pl-8 text-sm w-full"
        />
      </div>
    </div>
  );
}
