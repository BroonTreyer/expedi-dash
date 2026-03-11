import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUSES } from "@/lib/constants";
import { Search } from "lucide-react";

interface Props {
  filters: {
    status: string;
    vendedor: string;
    tipoCaminhao: string;
    busca: string;
    data: string;
    etapa: string;
  };
  onChange: (f: Props["filters"]) => void;
  vendedores: { id: string; nome_vendedor: string }[];
  tiposCaminhao: { id: string; nome_tipo: string }[];
}

export function Filters({ filters, onChange, vendedores, tiposCaminhao }: Props) {
  const set = (key: string, value: string) => onChange({ ...filters, [key]: value });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap items-center gap-2">
      <Input
        type="date"
        value={filters.data}
        onChange={(e) => set("data", e.target.value)}
        className="h-9 text-sm col-span-2 sm:col-span-1 md:w-[150px]"
      />
      <Select value={filters.etapa} onValueChange={(v) => set("etapa", v)}>
        <SelectTrigger className="h-9 text-sm md:w-[170px]">
          <SelectValue placeholder="Etapa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas Etapas</SelectItem>
          <SelectItem value="vendas">Pendentes Logística</SelectItem>
          <SelectItem value="logistica">Logística Completa</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.status} onValueChange={(v) => set("status", v)}>
        <SelectTrigger className="h-9 text-sm md:w-[170px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os Status</SelectItem>
          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.vendedor} onValueChange={(v) => set("vendedor", v)}>
        <SelectTrigger className="h-9 text-sm md:w-[170px]">
          <SelectValue placeholder="Vendedor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos Vendedores</SelectItem>
          {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome_vendedor}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.tipoCaminhao} onValueChange={(v) => set("tipoCaminhao", v)}>
        <SelectTrigger className="h-9 text-sm md:w-[170px]">
          <SelectValue placeholder="Tipo Caminhão" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos Tipos</SelectItem>
          {tiposCaminhao.map((t) => <SelectItem key={t.id} value={t.nome_tipo}>{t.nome_tipo}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="relative col-span-2 sm:col-span-1 md:flex-1 md:min-w-[150px] md:max-w-[200px]">
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
