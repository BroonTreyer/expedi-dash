import { useMemo, useState, useEffect } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpFromLine, Clock, AlertTriangle, ParkingCircle, LogIn } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { CATEGORIAS, useCreateMovimentacao, useUpdateMovimentacao } from "@/hooks/useMovimentacoesPortaria";
import { useAuth } from "@/hooks/useAuth";
import { useSortableTable } from "@/hooks/useSortableTable";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
  search: string;
  categoriaFilter: string;
  onRegistrarSaida: (entrada: MovimentacaoPortaria) => void;
  isLoading?: boolean;
  readOnly?: boolean;
  dateFromStr?: string;
  dateToStr?: string;
}

const categoriaBadgeColor: Record<string, string> = {
  carga_propria: "bg-primary/10 text-primary border-primary/20",
  terceirizado: "bg-secondary text-secondary-foreground border-secondary/50",
  fornecedor: "bg-accent/10 text-accent border-accent/20",
  visitante: "bg-muted text-muted-foreground border-muted",
  prestador: "bg-muted/80 text-muted-foreground border-border",
  outros: "bg-muted/60 text-muted-foreground border-border",
};

function formatTempo(minutos: number): string {
  if (minutos < 60) return `${minutos}min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

function getTempoClass(minutos: number): string {
  if (minutos >= 480) return "text-destructive font-semibold";
  if (minutos >= 240) return "text-yellow-600 dark:text-yellow-400 font-medium";
  return "text-muted-foreground";
}

function getInfoExtra(m: MovimentacaoPortaria): string | null {
  if (m.categoria === "carga_propria" && m.rota) return `Rota: ${m.rota}`;
  if ((m.categoria === "visitante" || m.categoria === "prestador") && m.nome_completo) {
    let info = m.nome_completo;
    if (m.categoria === "prestador" && m.servico_executar) info += ` — ${m.servico_executar}`;
    if (m.categoria === "visitante" && m.pessoa_visitada) info += ` → ${m.pessoa_visitada}`;
    return info;
  }
  return null;
}

export function PatioAtualTab({ movimentacoes, search, categoriaFilter, onRegistrarSaida, isLoading, readOnly, dateFromStr, dateToStr }: Props) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const createMov = useCreateMovimentacao();
  const [now, setNow] = useState(() => new Date());
  const [saidaRapidaId, setSaidaRapidaId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { sort, toggleSort, sortData } = useSortableTable("data_hora", "asc");

  // Reset saidaRapidaId when movimentacoes change (e.g. tab switch, data refresh)
  useEffect(() => {
    setSaidaRapidaId(null);
  }, [movimentacoes]);

  // Timer with visibility awareness to avoid memory leak
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        setNow(new Date());
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const veiculosNoPatio = useMemo(() => {
    const saidasVinculadas = new Set(
      movimentacoes
        .filter((m) => m.tipo_movimento === "saida" && m.movimento_vinculado_id)
        .map((m) => m.movimento_vinculado_id!)
    );
    return movimentacoes
      .filter((m) => m.tipo_movimento === "entrada" && !saidasVinculadas.has(m.id))
      .filter((m) => m.categoria !== "terceirizado")
      .filter((m) => {
        if (categoriaFilter && m.categoria !== categoriaFilter) return false;
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          m.placa?.toLowerCase().includes(s) ||
          m.motorista?.toLowerCase().includes(s) ||
          m.empresa?.toLowerCase().includes(s) ||
          m.nome_completo?.toLowerCase().includes(s) ||
          m.documento?.toLowerCase().includes(s) ||
          m.pessoa_visitada?.toLowerCase().includes(s) ||
          m.servico_executar?.toLowerCase().includes(s) ||
          m.rota?.toLowerCase().includes(s)
        );
      });
  }, [movimentacoes, search, categoriaFilter]);

  const sortedVeiculos = useMemo(() => {
    return sortData(veiculosNoPatio, {
      data_hora: (m) => new Date(m.data_hora).getTime(),
      tempo: (m) => differenceInMinutes(now, new Date(m.data_hora)),
      categoria: (m) => m.categoria,
      placa: (m) => m.placa,
      motorista: (m) => m.motorista,
      empresa: (m) => m.empresa,
    });
  }, [veiculosNoPatio, sortData, now]);

  const getCategoriaLabel = (val: string) => CATEGORIAS.find((c) => c.value === val)?.label || val;

  const handleSaidaRapida = async (entrada: MovimentacaoPortaria) => {
    setSavingId(entrada.id);
    try {
      await createMov.mutateAsync({
        tipo_movimento: "saida",
        categoria: entrada.categoria,
        placa: entrada.placa,
        motorista: entrada.motorista || null,
        empresa: entrada.empresa || null,
        destino_setor: entrada.destino_setor || null,
        motivo: null,
        carga_id: entrada.carga_id || null,
        foto_placa_url: null,
        texto_placa_lido: null,
        confianca_placa: null,
        placa_confirmada: entrada.placa,
        foto_documento_url: null,
        observacoes: null,
        usuario_id: user?.id ?? null,
        movimento_vinculado_id: entrada.id,
        // Propagate category-specific fields
        nome_completo: entrada.nome_completo || null,
        documento: entrada.documento || null,
        rota: entrada.rota || null,
        pessoa_visitada: entrada.pessoa_visitada || null,
        servico_executar: entrada.servico_executar || null,
        tipo_operacao: entrada.tipo_operacao || null,
        nota_fiscal: entrada.nota_fiscal || null,
        telefone: entrada.telefone || null,
        apelido: entrada.apelido || null,
      });
      setSaidaRapidaId(null);
    } catch {
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (sortedVeiculos.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
        <ParkingCircle className="h-10 w-10 opacity-30" />
        <p className="font-medium">Nenhum veículo no pátio</p>
        <p className="text-xs">Registre uma entrada para começar</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="p-3 space-y-3">
        {sortedVeiculos.map((m) => {
          const minutos = differenceInMinutes(now, new Date(m.data_hora));
          const isSaidaRapida = saidaRapidaId === m.id;
          const isSaving = savingId === m.id;
          const infoExtra = getInfoExtra(m);

          return (
            <Card key={m.id} className={minutos >= 480 ? "border-destructive/40 bg-destructive/5" : minutos >= 240 ? "border-yellow-500/40 bg-yellow-500/5" : ""}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm">{m.placa || "—"}</span>
                  <Badge variant="outline" className={`text-[11px] ${categoriaBadgeColor[m.categoria] || ""}`}>
                    {getCategoriaLabel(m.categoria)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Entrada: </span>
                    <span className="font-medium">{format(new Date(m.data_hora), dateFromStr !== dateToStr ? "dd/MM HH:mm" : "HH:mm", { locale: ptBR })}</span>
                  </div>
                  <div className={getTempoClass(minutos)}>
                    {minutos >= 480 && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                    {formatTempo(minutos)}
                  </div>
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
                    <div className="col-span-2 truncate">
                      <span className="text-muted-foreground">Setor: </span>{m.destino_setor}
                    </div>
                  )}
                  {infoExtra && (
                    <div className="col-span-2 truncate text-primary/80">
                      {infoExtra}
                    </div>
                  )}
                </div>
                {!readOnly && (
                <div className="flex justify-end pt-1">
                  {m.categoria === "carga_propria" ? (
                    <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m)}>
                       <ArrowUpFromLine className="h-3 w-3" /> Retorno c/ KM
                    </Button>
                  ) : isSaidaRapida ? (
                    <div className="flex items-center gap-3 animate-in fade-in duration-200">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSaidaRapidaId(null)} disabled={isSaving}>
                        Cancelar
                      </Button>
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => handleSaidaRapida(m)} disabled={isSaving}>
                        {isSaving ? <span className="animate-spin">⏳</span> : <ArrowUpFromLine className="h-3 w-3" />}
                        Confirmar Retorno
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => setSaidaRapidaId(m.id)}>
                       <ArrowUpFromLine className="h-3 w-3" /> Retorno
                    </Button>
                  )}
                </div>
                )}
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
            <SortableTableHead sortKey="data_hora" sort={sort} onSort={toggleSort}>Entrada</SortableTableHead>
            <SortableTableHead sortKey="tempo" sort={sort} onSort={toggleSort}>Tempo</SortableTableHead>
            <SortableTableHead sortKey="categoria" sort={sort} onSort={toggleSort}>Categoria</SortableTableHead>
            <SortableTableHead sortKey="placa" sort={sort} onSort={toggleSort}>Placa</SortableTableHead>
            <SortableTableHead sortKey="motorista" sort={sort} onSort={toggleSort}>Motorista</SortableTableHead>
            <TableHead>Info</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedVeiculos.map((m) => {
            const minutos = differenceInMinutes(now, new Date(m.data_hora));
            const isSaidaRapida = saidaRapidaId === m.id;
            const isSaving = savingId === m.id;
            const infoExtra = getInfoExtra(m);

            return (
              <TableRow key={m.id} className={minutos >= 480 ? "bg-destructive/5" : minutos >= 240 ? "bg-yellow-500/5" : ""}>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(new Date(m.data_hora), "HH:mm", { locale: ptBR })}
                  </div>
                </TableCell>
                <TableCell>
                  <div className={`flex items-center gap-1 text-sm ${getTempoClass(minutos)}`}>
                    {minutos >= 480 && <AlertTriangle className="h-3 w-3" />}
                    {formatTempo(minutos)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={categoriaBadgeColor[m.categoria] || ""}>
                    {getCategoriaLabel(m.categoria)}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono font-medium">{m.placa || "—"}</TableCell>
                <TableCell>{m.motorista || "—"}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">
                  {infoExtra || m.empresa || m.destino_setor || "—"}
                </TableCell>
                <TableCell className="text-right">
                  {!readOnly && (
                  m.categoria === "carga_propria" ? (
                    <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m)}>
                      <ArrowUpFromLine className="h-3 w-3" /> Retorno c/ KM
                    </Button>
                  ) : isSaidaRapida ? (
                    <div className="flex items-center gap-3 justify-end animate-in fade-in duration-200">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSaidaRapidaId(null)} disabled={isSaving}>
                        Cancelar
                      </Button>
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => handleSaidaRapida(m)} disabled={isSaving}>
                        {isSaving ? <span className="animate-spin">⏳</span> : <ArrowUpFromLine className="h-3 w-3" />}
                        Confirmar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => setSaidaRapidaId(m.id)}>
                        <ArrowUpFromLine className="h-3 w-3" /> Retorno
                      </Button>
                    </div>
                  )
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
