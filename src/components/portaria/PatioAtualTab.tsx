import { useMemo, useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpFromLine, Clock, AlertTriangle, ParkingCircle } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { CATEGORIAS, useCreateMovimentacao } from "@/hooks/useMovimentacoesPortaria";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
  search: string;
  categoriaFilter: string;
  onRegistrarSaida: (entrada: MovimentacaoPortaria) => void;
  isLoading?: boolean;
}

const categoriaBadgeColor: Record<string, string> = {
  carga_propria: "bg-primary/10 text-primary border-primary/20",
  fornecedor: "bg-accent/10 text-accent-foreground border-accent/20",
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
  if (minutos >= 480) return "text-destructive font-semibold"; // 8h+
  if (minutos >= 240) return "text-yellow-600 dark:text-yellow-400 font-medium"; // 4h+
  return "text-muted-foreground";
}

export function PatioAtualTab({ movimentacoes, search, categoriaFilter, onRegistrarSaida, isLoading }: Props) {
  const { user } = useAuth();
  const createMov = useCreateMovimentacao();
  const [now, setNow] = useState(() => new Date());
  const [saidaRapidaId, setSaidaRapidaId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Update timer every minute
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
          {veiculosNoPatio.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ParkingCircle className="h-10 w-10 opacity-30" />
                  <p className="font-medium">Nenhum veículo no pátio</p>
                  <p className="text-xs">Registre uma entrada para começar</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            veiculosNoPatio.map((m) => {
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
                    {isSaidaRapida ? (
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
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
