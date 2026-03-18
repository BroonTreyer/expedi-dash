import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownToLine, ArrowUpFromLine, Eye, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();

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

  if (filtered.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
        <History className="h-10 w-10 opacity-30" />
        <p className="font-medium">Nenhum movimento registrado</p>
        <p className="text-xs">Os movimentos do dia aparecerão aqui</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="p-3 space-y-3">
        {filtered.map((m) => (
          <Card key={m.id} className="cursor-pointer active:bg-muted/50" onClick={() => onViewDetails(m)}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={m.tipo_movimento === "entrada" ? "default" : "secondary"} className="gap-1 text-[11px]">
                    {m.tipo_movimento === "entrada" ? (
                      <><ArrowDownToLine className="h-3 w-3" /> Entrada</>
                    ) : (
                      <><ArrowUpFromLine className="h-3 w-3" /> Saída</>
                    )}
                  </Badge>
                  <span className="text-xs font-medium text-muted-foreground">
                    {format(new Date(m.data_hora), "HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm">{m.placa || "—"}</span>
                <Badge variant="outline" className={`text-[11px] ${categoriaBadgeColor[m.categoria] || ""}`}>
                  {getCategoriaLabel(m.categoria)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                {m.motorista && (
                  <div className="col-span-2 truncate">
                    <span className="text-muted-foreground">Motorista: </span>{m.motorista}
                  </div>
                )}
                {m.empresa && (
                  <div className="col-span-2 truncate">
                    <span className="text-muted-foreground">Empresa: </span>{m.empresa}
                  </div>
                )}
                {m.destino_setor && (
                  <div className="truncate">
                    <span className="text-muted-foreground">Setor: </span>{m.destino_setor}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
          {filtered.map((m) => (
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
