import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownToLine, ArrowUpFromLine, Eye, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { CATEGORIAS } from "@/hooks/useMovimentacoesPortaria";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
  search: string;
  categoriaFilter: string;
  tipoFilter: string;
  onViewDetails: (m: MovimentacaoPortaria) => void;
  isLoading?: boolean;
}

const categoriaBadgeColor: Record<string, string> = {
  carga_propria: "bg-primary/10 text-primary border-primary/20",
  fornecedor: "bg-accent/10 text-accent-foreground border-accent/20",
  visitante: "bg-secondary text-secondary-foreground",
  prestador: "bg-muted text-muted-foreground",
  outros: "bg-muted text-muted-foreground",
};

export function HistoricoTab({ movimentacoes, search, categoriaFilter, tipoFilter, onViewDetails, isLoading }: Props) {
  const filtered = useMemo(() => {
    return movimentacoes.filter((m) => {
      if (tipoFilter && m.tipo_movimento !== tipoFilter) return false;
      if (categoriaFilter && m.categoria !== categoriaFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        m.placa?.toLowerCase().includes(s) ||
        m.motorista?.toLowerCase().includes(s) ||
        m.empresa?.toLowerCase().includes(s)
      );
    });
  }, [movimentacoes, search, categoriaFilter, tipoFilter]);

  const getCategoriaLabel = (val: string) => CATEGORIAS.find((c) => c.value === val)?.label || val;

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hora</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Placa</TableHead>
            <TableHead>Motorista</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <History className="h-10 w-10 opacity-30" />
                  <p className="font-medium">Nenhum movimento registrado</p>
                  <p className="text-xs">Os movimentos do dia aparecerão aqui</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-sm font-medium">
                  {format(new Date(m.data_hora), "HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge variant={m.tipo_movimento === "entrada" ? "default" : "secondary"} className="gap-1 text-xs">
                    {m.tipo_movimento === "entrada" ? (
                      <><ArrowDownToLine className="h-3 w-3" /> Entrada</>
                    ) : (
                      <><ArrowUpFromLine className="h-3 w-3" /> Saída</>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={categoriaBadgeColor[m.categoria] || ""}>
                    {getCategoriaLabel(m.categoria)}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono font-medium">{m.placa || "—"}</TableCell>
                <TableCell>{m.motorista || "—"}</TableCell>
                <TableCell className="text-sm">{m.empresa || "—"}</TableCell>
                <TableCell className="text-sm">{m.destino_setor || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs" onClick={() => onViewDetails(m)}>
                    <Eye className="h-3 w-3" /> Detalhes
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
