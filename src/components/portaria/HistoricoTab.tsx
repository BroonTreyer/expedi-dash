import { useMemo, useState, useEffect } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowDownToLine, ArrowUpFromLine, Eye, History, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { CATEGORIAS, useDeleteMovimentacao } from "@/hooks/useMovimentacoesPortaria";
import { useAuth } from "@/hooks/useAuth";
import { useSortableTable } from "@/hooks/useSortableTable";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
  search: string;
  categoriaFilter: string;
  tipoFilter: string;
  onViewDetails: (entrada: MovimentacaoPortaria | undefined, saida: MovimentacaoPortaria | undefined) => void;
  isLoading?: boolean;
  isMultiDay?: boolean;
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

const PAGE_SIZE = 25;

export function HistoricoTab({ movimentacoes, search, categoriaFilter, tipoFilter, onViewDetails, isLoading, isMultiDay }: Props) {
  const isMobile = useIsMobile();
  const { role } = useAuth();
  const deleteMov = useDeleteMovimentacao();
  const isAdmin = role === "admin";
  const [page, setPage] = useState(0);
  const { sort, toggleSort, sortData } = useSortableTable();

  const grupos = useMemo(() => {
    // Pre-index by id for O(1) lookup
    const byId = new Map<string, MovimentacaoPortaria>();
    for (const m of movimentacoes) byId.set(m.id, m);

    const groupMap = new Map<string, GrupoMovimento>();
    const usedIds = new Set<string>();

    // First pass: find saídas that link to entradas
    for (const m of movimentacoes) {
      if (m.tipo_movimento === "saida" && m.movimento_vinculado_id) {
        const entrada = byId.get(m.movimento_vinculado_id);
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

    // Second pass: standalone movements
    for (const m of movimentacoes) {
      if (usedIds.has(m.id)) continue;
      groupMap.set(m.id, {
        entrada: m.tipo_movimento === "entrada" ? m : undefined,
        saida: m.tipo_movimento === "saida" ? m : undefined,
        principal: m,
        dataRecente: m.data_hora,
      });
    }

    let result = Array.from(groupMap.values());

    // Apply filters
    result = result.filter((g) => {
      const ref = g.entrada || g.saida!;
      if (tipoFilter === "entrada" && !g.entrada) return false;
      if (tipoFilter === "saida" && !g.saida) return false;
      if (categoriaFilter && ref.categoria !== categoriaFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          ref.placa?.toLowerCase().includes(s) ||
          ref.motorista?.toLowerCase().includes(s) ||
          ref.empresa?.toLowerCase().includes(s) ||
          ref.nome_completo?.toLowerCase().includes(s) ||
          ref.documento?.toLowerCase().includes(s) ||
          ref.pessoa_visitada?.toLowerCase().includes(s) ||
          ref.servico_executar?.toLowerCase().includes(s) ||
          ref.rota?.toLowerCase().includes(s)
        );
      }
      return true;
    });

    // Sort by most recent by default
    result.sort((a, b) => new Date(b.dataRecente).getTime() - new Date(a.dataRecente).getTime());

    return result;
  }, [movimentacoes, search, categoriaFilter, tipoFilter]);

  // Apply custom sort if user clicked a column
  const sortedGrupos = useMemo(() => {
    if (!sort.key) return grupos;
    return sortData(grupos, {
      hora: (g) => new Date(g.dataRecente).getTime(),
      categoria: (g) => (g.entrada || g.saida!).categoria,
      placa: (g) => (g.entrada || g.saida!).placa,
      motorista: (g) => (g.entrada || g.saida!).motorista,
      empresa: (g) => (g.entrada || g.saida!).empresa,
    });
  }, [grupos, sort, sortData]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [search, categoriaFilter, tipoFilter]);

  const totalPages = Math.ceil(sortedGrupos.length / PAGE_SIZE);
  const paginatedGrupos = sortedGrupos.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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

  if (sortedGrupos.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
        <History className="h-10 w-10 opacity-30" />
        <p className="font-medium">Nenhum movimento registrado</p>
        <p className="text-xs">Os movimentos do dia aparecerão aqui</p>
      </div>
    );
  }

  const dateFmt = isMultiDay ? "dd/MM HH:mm" : "HH:mm";

  const formatHora = (g: GrupoMovimento) => {
    if (g.entrada && g.saida) {
      return `${format(new Date(g.entrada.data_hora), dateFmt, { locale: ptBR })} → ${format(new Date(g.saida.data_hora), dateFmt, { locale: ptBR })}`;
    }
    const m = g.entrada || g.saida!;
    return format(new Date(m.data_hora), dateFmt, { locale: ptBR });
  };

  const ref = (g: GrupoMovimento) => g.entrada || g.saida!;

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between px-4 py-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sortedGrupos.length)} de {sortedGrupos.length}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-1">{page + 1}/{totalPages}</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div>
        <div className="p-3 space-y-3">
          {paginatedGrupos.map((g) => {
            const r = ref(g);
            return (
              <Card key={r.id} className="cursor-pointer active:bg-muted/50" onClick={() => onViewDetails(g.entrada, g.saida)}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm">{r.placa || r.nome_completo || "—"}</span>
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {g.entrada && (
                      <Badge variant="default" className="gap-1 text-[11px]">
                        <ArrowDownToLine className="h-3 w-3" />
                        {format(new Date(g.entrada.data_hora), dateFmt, { locale: ptBR })}
                      </Badge>
                    )}
                     {g.saida && (
                      <Badge variant="secondary" className="gap-1 text-[11px]">
                        <ArrowUpFromLine className="h-3 w-3" /> Retorno{" "}
                        {format(new Date(g.saida.data_hora), dateFmt, { locale: ptBR })}
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
                    {r.rota && (
                      <div className="col-span-2 truncate">
                        <span className="text-muted-foreground">Rota: </span>{r.rota}
                      </div>
                    )}
                    {r.nome_completo && (
                      <div className="col-span-2 truncate">
                        <span className="text-muted-foreground">Nome: </span>{r.nome_completo}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <PaginationControls />
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="hora" sort={sort} onSort={toggleSort}>Hora</SortableTableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <SortableTableHead sortKey="categoria" sort={sort} onSort={toggleSort} className="text-center">Categoria</SortableTableHead>
              <SortableTableHead sortKey="placa" sort={sort} onSort={toggleSort} className="text-center">Placa</SortableTableHead>
              <SortableTableHead sortKey="motorista" sort={sort} onSort={toggleSort} className="text-center">Motorista</SortableTableHead>
              <SortableTableHead sortKey="empresa" sort={sort} onSort={toggleSort} className="text-center">Empresa</SortableTableHead>
              <TableHead className="text-center">Setor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedGrupos.map((g) => {
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
                  <TableCell className="text-center">{r.motorista || r.nome_completo || "—"}</TableCell>
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
      <PaginationControls />
    </div>
  );
}
