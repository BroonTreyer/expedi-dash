import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpFromLine, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { CATEGORIAS } from "@/hooks/useMovimentacoesPortaria";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
  search: string;
  categoriaFilter: string;
  onRegistrarSaida: (entrada: MovimentacaoPortaria) => void;
}

const categoriaBadgeColor: Record<string, string> = {
  carga_propria: "bg-primary/10 text-primary border-primary/20",
  fornecedor: "bg-accent/10 text-accent-foreground border-accent/20",
  visitante: "bg-secondary text-secondary-foreground",
  prestador: "bg-muted text-muted-foreground",
  outros: "bg-muted text-muted-foreground",
};

export function PatioAtualTab({ movimentacoes, search, categoriaFilter, onRegistrarSaida }: Props) {
  const veiculosNoPatio = useMemo(() => {
    const saidasVinculadas = new Set(
      movimentacoes
        .filter((m) => m.tipo_movimento === "saida" && m.movimento_vinculado_id)
        .map((m) => m.movimento_vinculado_id!)
    );
    return movimentacoes
      .filter((m) => m.tipo_movimento === "entrada" && !saidasVinculadas.has(m.id))
      .filter((m) => {
        if (categoriaFilter && m.categoria !== categoriaFilter) return false;
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          m.placa?.toLowerCase().includes(s) ||
          m.motorista?.toLowerCase().includes(s) ||
          m.empresa?.toLowerCase().includes(s)
        );
      });
  }, [movimentacoes, search, categoriaFilter]);

  const getCategoriaLabel = (val: string) => CATEGORIAS.find((c) => c.value === val)?.label || val;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entrada</TableHead>
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
          {veiculosNoPatio.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Nenhum veículo no pátio no momento.
              </TableCell>
            </TableRow>
          ) : (
            veiculosNoPatio.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(new Date(m.data_hora), "HH:mm", { locale: ptBR })}
                  </div>
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
                  <Button size="sm" variant="secondary" className="gap-1" onClick={() => onRegistrarSaida(m)}>
                    <ArrowUpFromLine className="h-3 w-3" /> Saída
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
