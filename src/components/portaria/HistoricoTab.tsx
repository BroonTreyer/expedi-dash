import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowDownToLine, ArrowUpFromLine, Eye, History, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { CATEGORIAS, useDeleteMovimentacao } from "@/hooks/useMovimentacoesPortaria";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
  search: string;
  categoriaFilter: string;
  tipoFilter: string;
  onViewDetails: (entrada: MovimentacaoPortaria | undefined, saida: MovimentacaoPortaria | undefined) => void;
  isLoading?: boolean;
}

interface GrupoMovimento {
  entrada?: MovimentacaoPortaria;
  saida?: MovimentacaoPortaria;
  principal: MovimentacaoPortaria;
  dataRecente: string;
}

const categoriaBadgeColor: Record<string, string> = {
  carga_propria: "bg-primary/10 text-primary border-primary/20",
  terceirizado: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  fornecedor: "bg-accent/10 text-accent border-accent/20",
  visitante: "bg-secondary text-secondary-foreground",
  prestador: "bg-muted text-muted-foreground",
  outros: "bg-muted text-muted-foreground",
};

export function HistoricoTab({ movimentacoes, search, categoriaFilter, tipoFilter, onViewDetails, isLoading }: Props) {
  const isMobile = useIsMobile();
  const { role } = useAuth();
  const deleteMov = useDeleteMovimentacao();
  const isAdmin = role === "admin";
  const grupos = useMemo(() => {
    // Build groups by linking entrada/saida via movimento_vinculado_id
    const groupMap = new Map<string, GrupoMovimento>();
    const usedIds = new Set<string>();

    // First pass: find saídas that link to entradas
    for (const m of movimentacoes) {
      if (m.tipo_movimento === "saida" && m.movimento_vinculado_id) {
        const entrada = movimentacoes.find((e) => e.id === m.movimento_vinculado_id);
        if (entrada) {
          const key = entrada.id;
          groupMap.set(key, {
            entrada,
            saida: m,
            principal: entrada,
            dataRecente: m.data_hora > entrada.data_hora ? m.data_hora : entrada.data_hora,
          });
          usedIds.add(entrada.id);
          usedIds.add(m.id);
        }
      }
    }

    // Second pass: standalone movements (not yet grouped)
    for (const m of movimentacoes) {
      if (usedIds.has(m.id)) continue;
      groupMap.set(m.id, {
        entrada: m.tipo_movimento === "entrada" ? m : undefined,
        saida: m.tipo_movimento === "saida" ? m : undefined,
        principal: m,
        dataRecente: m.data_hora,
      });
    }

    // Convert to array, filter, and sort
    let result = Array.from(groupMap.values());

    // Apply filters
    result = result.filter((g) => {
      const ref = g.entrada || g.saida!;
      // Tipo filter
      if (tipoFilter === "entrada" && !g.entrada) return false;
      if (tipoFilter === "saida" && !g.saida) return false;
      // Categoria filter
      if (categoriaFilter && ref.categoria !== categoriaFilter) return false;
      // Search
      if (search) {
        const s = search.toLowerCase();
        return (
          ref.placa?.toLowerCase().includes(s) ||
          ref.motorista?.toLowerCase().includes(s) ||
          ref.empresa?.toLowerCase().includes(s)
        );
      }
      return true;
    });

    // Sort by most recent
    result.sort((a, b) => new Date(b.dataRecente).getTime() - new Date(a.dataRecente).getTime());

    return result;
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

  if (grupos.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
        <History className="h-10 w-10 opacity-30" />
        <p className="font-medium">Nenhum movimento registrado</p>
        <p className="text-xs">Os movimentos do dia aparecerão aqui</p>
      </div>
    );
  }

  const formatHora = (g: GrupoMovimento) => {
    if (g.entrada && g.saida) {
      return `${format(new Date(g.entrada.data_hora), "HH:mm", { locale: ptBR })} → ${format(new Date(g.saida.data_hora), "HH:mm", { locale: ptBR })}`;
    }
    const m = g.entrada || g.saida!;
    return format(new Date(m.data_hora), "HH:mm", { locale: ptBR });
  };

  const ref = (g: GrupoMovimento) => g.entrada || g.saida!;

  if (isMobile) {
    return (
      <div className="p-3 space-y-3">
        {grupos.map((g) => {
          const r = ref(g);
          return (
            <Card key={r.id} className="cursor-pointer active:bg-muted/50" onClick={() => onViewDetails(g.entrada, g.saida)}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm">{r.placa || "—"}</span>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {g.entrada && (
                    <Badge variant="default" className="gap-1 text-[11px]">
                      <ArrowDownToLine className="h-3 w-3" />
                      {format(new Date(g.entrada.data_hora), "HH:mm", { locale: ptBR })}
                    </Badge>
                  )}
                  {g.saida && (
                    <Badge variant="secondary" className="gap-1 text-[11px]">
                      <ArrowUpFromLine className="h-3 w-3" />
                      {format(new Date(g.saida.data_hora), "HH:mm", { locale: ptBR })}
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-[11px] ${categoriaBadgeColor[r.categoria] || ""}`}>
                    {getCategoriaLabel(r.categoria)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  {r.motorista && (
                    <div className="col-span-2 truncate">
                      <span className="text-muted-foreground">Motorista: </span>{r.motorista}
                    </div>
                  )}
                  {r.empresa && (
                    <div className="col-span-2 truncate">
                      <span className="text-muted-foreground">Empresa: </span>{r.empresa}
                    </div>
                  )}
                  {r.destino_setor && (
                    <div className="truncate">
                      <span className="text-muted-foreground">Setor: </span>{r.destino_setor}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hora</TableHead>
            <TableHead className="text-center">Tipo</TableHead>
            <TableHead className="text-center">Categoria</TableHead>
            <TableHead className="text-center">Placa</TableHead>
            <TableHead className="text-center">Motorista</TableHead>
            <TableHead className="text-center">Empresa</TableHead>
            <TableHead className="text-center">Setor</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grupos.map((g) => {
            const r = ref(g);
            return (
              <TableRow key={r.id}>
                <TableCell className="text-sm font-medium whitespace-nowrap">
                  {formatHora(g)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {g.entrada && (
                      <Badge variant="default" className="gap-1 text-xs">
                        <ArrowDownToLine className="h-3 w-3" /> Entrada
                      </Badge>
                    )}
                    {g.saida && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <ArrowUpFromLine className="h-3 w-3" /> Retorno
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={categoriaBadgeColor[r.categoria] || ""}>
                    {getCategoriaLabel(r.categoria)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-mono font-medium">{r.placa || "—"}</TableCell>
                <TableCell className="text-center">{r.motorista || "—"}</TableCell>
                <TableCell className="text-center text-sm">{r.empresa || "—"}</TableCell>
                <TableCell className="text-center text-sm">{r.destino_setor || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs" onClick={() => onViewDetails(g.entrada, g.saida)}>
                      <Eye className="h-3 w-3" /> Detalhes
                    </Button>
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMov.mutateAsync(r.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
