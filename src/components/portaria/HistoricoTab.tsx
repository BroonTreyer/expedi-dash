import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { CATEGORIAS } from "@/hooks/useMovimentacoesPortaria";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
  search: string;
  categoriaFilter: string;
  tipoFilter: string;
  onViewDetails: (mov: MovimentacaoPortaria) => void;
}

const categoriaBadgeColor: Record<string, string> = {
  carga_propria: "bg-primary/10 text-primary border-primary/20",
  fornecedor: "bg-accent/10 text-accent-foreground border-accent/20",
  visitante: "bg-secondary text-secondary-foreground",
  prestador: "bg-muted text-muted-foreground",
  outros: "bg-muted text-muted-foreground",
};

export function HistoricoTab({ movimentacoes, search, categoriaFilter, tipoFilter, onViewDetails }: Props) {
  const filtered = useMemo(() => {
    return movimentacoes.filter((m) => {
      if (categoriaFilter && m.categoria !== categoriaFilter) return false;
      if (tipoFilter && m.tipo_movimento !== tipoFilter) return false;
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
            <TableHead>Carga</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                Nenhum movimento encontrado.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-sm font-medium">
                  {format(new Date(m.data_hora), "HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge variant={m.tipo_movimento === "entrada" ? "default" : "secondary"} className="gap-1">
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
                <TableCell className="text-xs">{m.carga_id || "—"}</TableCell>
                <TableCell className="text-right">
                  {(m.foto_placa_url || m.foto_documento_url || m.observacoes) && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => onViewDetails(m)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
