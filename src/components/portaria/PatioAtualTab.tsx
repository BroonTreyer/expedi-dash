import { useMemo, useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpFromLine, Clock, AlertTriangle, ParkingCircle } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { CATEGORIAS, useCreateMovimentacao } from "@/hooks/useMovimentacoesPortaria";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
  search: string;
  categoriaFilter: string;
  onRegistrarSaida: (entrada: MovimentacaoPortaria) => void;
  isLoading?: boolean;
}

const categoriaBadgeColor: Record<string, string> = {
  carga_propria: "bg-primary/10 text-primary border-primary/20",
  terceirizado: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  fornecedor: "bg-accent/10 text-accent border-accent/20",
  visitante: "bg-secondary text-secondary-foreground",
  prestador: "bg-muted text-muted-foreground",
  outros: "bg-muted text-muted-foreground",
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

export function PatioAtualTab({ movimentacoes, search, categoriaFilter, onRegistrarSaida, isLoading }: Props) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const createMov = useCreateMovimentacao();
  const [now, setNow] = useState(() => new Date());
  const [saidaRapidaId, setSaidaRapidaId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
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
      // Terceirizado doesn't need exit — exclude from patio
      .filter((m) => m.categoria !== "terceirizado")
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

  if (veiculosNoPatio.length === 0) {
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
        {veiculosNoPatio.map((m) => {
          const minutos = differenceInMinutes(now, new Date(m.data_hora));
          const isSaidaRapida = saidaRapidaId === m.id;
          const isSaving = savingId === m.id;

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
                    <span className="font-medium">{format(new Date(m.data_hora), "HH:mm", { locale: ptBR })}</span>
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
                </div>
                <div className="flex justify-end pt-1">
                  {m.categoria === "carga_propria" ? (
                    <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m)}>
                       <ArrowUpFromLine className="h-3 w-3" /> Retorno c/ KM
                    </Button>
                  ) : isSaidaRapida ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSaidaRapidaId(null)} disabled={isSaving}>
                        Cancelar
                      </Button>
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => handleSaidaRapida(m)} disabled={isSaving}>
                        {isSaving ? <span className="animate-spin">⏳</span> : <ArrowUpFromLine className="h-3 w-3" />}
                        Confirmar
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => setSaidaRapidaId(m.id)}>
                       <ArrowUpFromLine className="h-3 w-3" /> Retorno
                    </Button>
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
            <TableHead>Entrada</TableHead>
            <TableHead>Tempo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Placa</TableHead>
            <TableHead>Motorista</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {veiculosNoPatio.map((m) => {
            const minutos = differenceInMinutes(now, new Date(m.data_hora));
            const isSaidaRapida = saidaRapidaId === m.id;
            const isSaving = savingId === m.id;

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
                <TableCell className="text-sm">{m.empresa || "—"}</TableCell>
                <TableCell className="text-sm">{m.destino_setor || "—"}</TableCell>
                <TableCell className="text-right">
                  {m.categoria === "carga_propria" ? (
                    <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m)}>
                      <ArrowUpFromLine className="h-3 w-3" /> Retorno c/ KM
                    </Button>
                  ) : isSaidaRapida ? (
                    <div className="flex items-center gap-1.5 justify-end animate-in fade-in duration-200">
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
                        <ArrowUpFromLine className="h-3 w-3" /> Saída
                      </Button>
                    </div>
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
