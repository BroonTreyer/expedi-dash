import { useMemo, useState, useEffect } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpFromLine, ArrowDownToLine, Clock, AlertTriangle, ParkingCircle, Loader2, Undo2, LogIn, Link2, Gauge } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { CATEGORIAS, useCreateMovimentacao, useUpdateMovimentacao } from "@/hooks/useMovimentacoesPortaria";
import { useAuth } from "@/hooks/useAuth";
import { useReabrirComoWalkIn } from "@/hooks/useVeiculosEsperados";
import { useSortableTable } from "@/hooks/useSortableTable";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { nextEtapa, etapaEfetiva, isFinalizada, type EtapaCargaPropria } from "@/lib/carga-propria-fsm";
import { VincularMovimentoCargaDialog } from "./VincularMovimentoCargaDialog";
import { EditarKmDialog } from "./EditarKmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  movimentacoes: MovimentacaoPortaria[];
  search: string;
  categoriaFilter: string;
  onRegistrarSaida: (entrada: MovimentacaoPortaria, etapa?: "retorno" | "lacre" | "saida_rota") => void;
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

function isEmRota(m: MovimentacaoPortaria): boolean {
  return m.categoria === "carga_propria" && m.etapa_carga_propria === "em_rota";
}

function getMinutosNoPatio(m: MovimentacaoPortaria, now: Date): number {
  // For "em_rota" vehicles, count time since they actually left for route.
  // Use horario_real_saida (per-record actual departure) — horario_saida_final
  // is reserved for the final/seal exit and may not be per-record.
  if (isEmRota(m)) {
    const ref = m.horario_real_saida || m.horario_saida_final || m.data_hora;
    return differenceInMinutes(now, new Date(ref));
  }
  return differenceInMinutes(now, new Date(m.data_hora));
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
  const { user, role } = useAuth();
  const isMobile = useIsMobile();
  const createMov = useCreateMovimentacao();
  const updateMov = useUpdateMovimentacao();
  const reabrirWalkIn = useReabrirComoWalkIn();
  const [now, setNow] = useState(() => new Date());
  const [saidaRapidaId, setSaidaRapidaId] = useState<string | null>(null);
  const [reabrirId, setReabrirId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [vincularMov, setVincularMov] = useState<MovimentacaoPortaria | null>(null);
  const [editKmMov, setEditKmMov] = useState<MovimentacaoPortaria | null>(null);
  const qc = useQueryClient();
  const { sort, toggleSort, sortData } = useSortableTable("data_hora", "asc");

  // Reset saidaRapidaId when movimentacoes change (e.g. tab switch, data refresh)
  useEffect(() => {
    setSaidaRapidaId(null);
    setReabrirId(null);
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
      .filter((m) => {
        // Carga própria 3-stage: show in pátio if em_rota or retornou
        if (m.categoria === "carga_propria" && m.tipo_movimento === "saida" && m.etapa_carga_propria) {
          return m.etapa_carga_propria !== "finalizado";
        }
        // Normal: show entradas without linked saída
        if (m.tipo_movimento !== "entrada") return false;
        if (saidasVinculadas.has(m.id)) return false;
        // Chegada registrada mas sem entrada física no pátio
        // (horario_chegada preenchido, horario_entrada nulo) NÃO pertence ao
        // Pátio Atual — a visibilidade fica no painel azul "Cargas fechadas
        // aguardando veículo", em estado âmbar com o botão
        // "Liberar entrada no pátio". Sem este filtro o veículo aparecia
        // duplicado (painel azul + pátio).
        if (m.horario_chegada && !m.horario_entrada) return false;
        // Exclude finalized terceirizados
        if (m.categoria === "terceirizado" && m.etapa_terceirizado === "finalizado") return false;
        // Terceirizado em 'chegada' SEM carga vinculada permanece visível
        // aqui em destaque vermelho com ação "Vincular carga". Antes era
        // escondido para um "painel laranja" que nunca existiu — virava fantasma.
        return true;
      })
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
    const sorted = sortData(veiculosNoPatio, {
      data_hora: (m) => new Date(m.data_hora).getTime(),
      tempo: (m) => getMinutosNoPatio(m, now),
      categoria: (m) => m.categoria,
      placa: (m) => m.placa,
      motorista: (m) => m.motorista,
      empresa: (m) => m.empresa,
    });
    // Cards "Aguardando vínculo" (vermelhos) sempre no topo — exigem ação.
    return [...sorted].sort((a, b) => {
      const av = a.categoria === "terceirizado" && a.etapa_terceirizado === "chegada" && !a.carga_id ? 0 : 1;
      const bv = b.categoria === "terceirizado" && b.etapa_terceirizado === "chegada" && !b.carga_id ? 0 : 1;
      return av - bv;
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
      // Mark entrada as finalizado for terceirizados
      if (entrada.categoria === "terceirizado") {
        await updateMov.mutateAsync({
          id: entrada.id,
          etapa_terceirizado: "finalizado",
          horario_real_saida: new Date().toISOString(),
        });
      }
      // A5 — Carga Própria também precisa fechar o ciclo na entrada original,
      // senão o veículo continua aparecendo no pátio mesmo após a saída rápida.
      if (entrada.categoria === "carga_propria") {
        await updateMov.mutateAsync({
          id: entrada.id,
          etapa_carga_propria: nextEtapa(entrada.etapa_carga_propria as EtapaCargaPropria | null, "saida_rapida"),
          horario_saida_final: new Date().toISOString(),
        });
      }
      setSaidaRapidaId(null);
    } catch {
    } finally {
      setSavingId(null);
    }
  };

  const podeReabrirRegistro = (m: MovimentacaoPortaria): boolean => {
    if (!(role === "admin" || role === "logistica")) return false;
    if (m.carga_id) return false; // só sem carga vinculada
    // D4 — Carga Própria também pode ser reaberta (ciclo na etapa "chegou"
    // sem progresso). Antes só terceirizado podia.
    if (m.categoria === "terceirizado" && m.etapa_terceirizado === "no_patio") return true;
    if (m.categoria === "carga_propria" && m.etapa_carga_propria === "chegou") return true;
    return false;
  };

  /** Movimento que registrou apenas a chegada — ainda não foi liberado para o pátio. */
  const isAguardandoLiberacao = (m: MovimentacaoPortaria): boolean => {
    if (m.horario_entrada) return false;
    // Carga própria não tem etapa intermediária — entra direto no pátio ao registrar chegada.
    if (m.categoria === "terceirizado" && m.etapa_terceirizado === "chegada") return true;
    return false;
  };

  /** Terceirizado chegou sem carga vinculada — bloqueia liberação até a Logística vincular. */
  const isAguardandoVinculoCarga = (m: MovimentacaoPortaria): boolean => {
    return (
      m.categoria === "terceirizado" &&
      m.etapa_terceirizado === "chegada" &&
      !m.carga_id
    );
  };

  const canVincular = role === "admin" || role === "logistica";

  const handleDesfazerChegada = async (m: MovimentacaoPortaria) => {
    if (m.horario_entrada) return;
    setSavingId(m.id);
    try {
      const { error } = await supabase
        .from("movimentacoes_portaria")
        .delete()
        .eq("id", m.id)
        .is("horario_entrada", null);
      if (error) throw error;
      toast.success("Chegada desfeita");
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao desfazer chegada");
    } finally {
      setSavingId(null);
    }
  };

  /**
   * B7 — Estado inconsistente: Carga Própria deveria ter `horario_entrada`
   * preenchido desde a criação (helper `buildCargaPropriaPayload` da Onda 1).
   * Se um registro chega aqui sem horario_entrada e ainda não está finalizado,
   * é defeito de criação anterior à Onda 1 ou inserção direta no banco.
   */
  const isCargaPropriaInconsistente = (m: MovimentacaoPortaria): boolean => {
    if (m.categoria !== "carga_propria") return false;
    if (m.etapa_carga_propria === "finalizado") return false;
    return !m.horario_entrada;
  };

  // Loga uma vez para auditoria (não polui o console em re-render)
  useEffect(() => {
    const inconsistentes = movimentacoes.filter(isCargaPropriaInconsistente);
    if (inconsistentes.length > 0) {
      // eslint-disable-next-line no-console
      console.warn("[Portaria] Carga Própria sem horario_entrada (estado inconsistente):", inconsistentes.map((m) => ({ id: m.id, placa: m.placa, etapa: m.etapa_carga_propria })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimentacoes.length]);

  const handleLiberarEntrada = async (m: MovimentacaoPortaria) => {
    setSavingId(m.id);
    try {
      const update: Record<string, any> = { horario_entrada: new Date().toISOString() };
      if (m.categoria === "carga_propria") update.etapa_carga_propria = "chegou";
      else if (m.categoria === "terceirizado") update.etapa_terceirizado = "no_patio";
      await updateMov.mutateAsync({ id: m.id, ...update } as any);
    } catch {
      // toast já tratado pelo hook
    } finally {
      setSavingId(null);
    }
  };

  const handleReabrirRegistro = async (m: MovimentacaoPortaria) => {
    setSavingId(m.id);
    try {
      await reabrirWalkIn.mutateAsync({
        id: m.id,
        placa: m.placa,
        motorista: m.motorista,
        empresa: m.empresa,
        tipo_caminhao: m.tipo_caminhao,
        data_hora: m.data_hora,
        categoria: m.categoria,
      });
      setReabrirId(null);
    } catch {
      // toast already shown by hook
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
        <p className="text-xs">Registre um movimento para começar</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
      <div className="p-3 space-y-3">
        {sortedVeiculos.map((m) => {
          const emRota = isEmRota(m);
          const minutos = getMinutosNoPatio(m, now);
          const isSaidaRapida = saidaRapidaId === m.id;
          const isSaving = savingId === m.id;
          const infoExtra = getInfoExtra(m);
          const isReabrir = reabrirId === m.id;
          const podeReabrir = podeReabrirRegistro(m);
          const aguardandoLib = isAguardandoLiberacao(m);
          const aguardandoVinculo = isAguardandoVinculoCarga(m);

          return (
            <Card key={m.id} className={aguardandoVinculo ? "border-destructive/60 bg-destructive/5 ring-1 ring-destructive/30" : aguardandoLib ? "border-amber-500/40 bg-amber-500/5" : emRota ? "" : minutos >= 480 ? "border-destructive/40 bg-destructive/5" : minutos >= 240 ? "border-yellow-500/40 bg-yellow-500/5" : ""}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm">{m.placa || "—"}</span>
                  <div className="flex items-center gap-1">
                    {aguardandoVinculo && (
                      <Badge variant="outline" className="text-[10px] h-5 gap-0.5 border-destructive/60 bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-3 w-3" /> Aguardando vínculo
                      </Badge>
                    )}
                    {aguardandoLib && (
                      <Badge variant="outline" className="text-[10px] h-5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        Aguardando Liberação
                      </Badge>
                    )}
                    {isCargaPropriaInconsistente(m) && (
                      <Badge variant="outline" className="text-[10px] h-5 gap-0.5 border-destructive/50 bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-3 w-3" /> Estado inconsistente
                      </Badge>
                    )}
                    {m.categoria === "carga_propria" && m.tipo_movimento === "entrada" && !isFinalizada(m.etapa_carga_propria as any) && (() => {
                      const etapaEff = etapaEfetiva(m.etapa_carga_propria as any);
                      return (
                        <Badge variant={etapaEff === "em_rota" ? "outline" : "default"} className={`text-[10px] ${etapaEff === "chegou" ? "bg-orange-500 text-white" : etapaEff === "em_rota" ? "border-blue-500 text-blue-700 dark:text-blue-400" : "bg-yellow-500 text-white"}`}>
                          {etapaEff === "chegou" ? "Chegou" : etapaEff === "em_rota" ? "Em Rota" : "Retornou"}
                        </Badge>
                      );
                    })()}
                    {m.categoria === "terceirizado" && m.etapa_terceirizado === "no_patio" && (
                      <Badge variant="default" className="text-[10px] bg-emerald-600 text-white">
                        No Pátio
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[11px] ${categoriaBadgeColor[m.categoria] || ""}`}>
                      {getCategoriaLabel(m.categoria)}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Horário: </span>
                    <span className="font-medium">{(() => {
                      const d = new Date(m.data_hora);
                      const hoje = new Date();
                      const mesmoDia = d.toDateString() === hoje.toDateString();
                      return format(d, mesmoDia ? "HH:mm" : "dd/MM HH:mm", { locale: ptBR });
                    })()}</span>
                  </div>
                  <div className={emRota ? "text-muted-foreground" : getTempoClass(minutos)}>
                    {!emRota && minutos >= 480 && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                    {emRota ? `em rota há ${formatTempo(minutos)}` : formatTempo(minutos)}
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
                  {m.categoria === "terceirizado" && (
                    <div className="col-span-2 text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
                      <span>Chegada: <strong className="text-foreground">{format(new Date(m.horario_chegada || m.data_hora), "HH:mm")}</strong></span>
                      {m.horario_entrada && <span>Entrada: <strong className="text-foreground">{format(new Date(m.horario_entrada), "HH:mm")}</strong></span>}
                      {m.horario_real_saida && <span>Saída: <strong className="text-foreground">{format(new Date(m.horario_real_saida), "HH:mm")}</strong></span>}
                    </div>
                  )}
                </div>
                {!readOnly && (
                <div className="flex justify-end pt-1">
                  {aguardandoVinculo ? (
                    <div className="flex items-center gap-1">
                      {canVincular && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive" onClick={() => handleDesfazerChegada(m)} disabled={isSaving}>
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                          Desfazer
                        </Button>
                      )}
                      {canVincular && (
                        <Button size="sm" variant="default" className="gap-1 h-7 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => setVincularMov(m)} disabled={isSaving}>
                          <Link2 className="h-3 w-3" /> Vincular carga
                        </Button>
                      )}
                    </div>
                  ) : aguardandoLib ? (
                    <Button size="sm" variant="default" className="gap-1 h-7 text-xs" onClick={() => handleLiberarEntrada(m)} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}
                      Liberar Entrada no Pátio
                    </Button>
                  ) : m.categoria === "carga_propria" && m.etapa_carga_propria === "chegou" ? (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs text-muted-foreground" onClick={() => setEditKmMov(m)} title="Editar KM">
                        <Gauge className="h-3 w-3" /> KM
                      </Button>
                      <Button size="sm" variant="default" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m, "saida_rota")}>
                         <ArrowUpFromLine className="h-3 w-3" /> Saída p/ Rota
                      </Button>
                    </div>
                  ) : m.categoria === "carga_propria" && m.etapa_carga_propria === "em_rota" ? (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs text-muted-foreground" onClick={() => setEditKmMov(m)} title="Editar KM">
                        <Gauge className="h-3 w-3" /> KM
                      </Button>
                      <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m, "retorno")}>
                         <ArrowDownToLine className="h-3 w-3" /> Registrar Retorno
                      </Button>
                    </div>
                  ) : m.categoria === "carga_propria" && m.etapa_carga_propria === "retornou" ? (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs text-muted-foreground" onClick={() => setEditKmMov(m)} title="Editar KM">
                        <Gauge className="h-3 w-3" /> KM
                      </Button>
                      <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m, "lacre")}>
                         <ArrowUpFromLine className="h-3 w-3" /> Saída c/ Lacre
                      </Button>
                    </div>
                  ) : m.categoria === "carga_propria" ? (
                    <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m)}>
                       <ArrowUpFromLine className="h-3 w-3" /> Saída c/ KM
                    </Button>
                  ) : m.categoria === "terceirizado" || m.categoria === "fornecedor" ? (
                    isReabrir ? (
                      <div className="flex items-center gap-3 animate-in fade-in duration-200">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setReabrirId(null)} disabled={isSaving}>
                          Cancelar
                        </Button>
                        <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => handleReabrirRegistro(m)} disabled={isSaving}>
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                          Confirmar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {podeReabrir && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-7 text-xs"
                            title="Enviar para Registro de Entrada para vincular carga"
                            onClick={() => setReabrirId(m.id)}
                          >
                            <Undo2 className="h-3 w-3" /> Enviar p/ Registro
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m)}>
                          <ArrowUpFromLine className="h-3 w-3" /> Registrar Saída
                        </Button>
                      </div>
                    )
                  ) : isSaidaRapida ? (
                    <div className="flex items-center gap-3 animate-in fade-in duration-200">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSaidaRapidaId(null)} disabled={isSaving}>
                        Cancelar
                      </Button>
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => handleSaidaRapida(m)} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpFromLine className="h-3 w-3" />}
                        Confirmar Saída
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => setSaidaRapidaId(m.id)}>
                       <ArrowUpFromLine className="h-3 w-3" /> Saída
                    </Button>
                  )}
                </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <VincularMovimentoCargaDialog
        open={!!vincularMov}
        onOpenChange={(o) => { if (!o) setVincularMov(null); }}
        movimento={vincularMov}
      />
      <EditarKmDialog
        open={!!editKmMov}
        onOpenChange={(o) => { if (!o) setEditKmMov(null); }}
        movimento={editKmMov}
      />
      </>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead sortKey="data_hora" sort={sort} onSort={toggleSort}>Horário</SortableTableHead>
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
            const emRota = isEmRota(m);
            const minutos = getMinutosNoPatio(m, now);
            const isSaidaRapida = saidaRapidaId === m.id;
            const isSaving = savingId === m.id;
            const infoExtra = getInfoExtra(m);
            const isReabrir = reabrirId === m.id;
            const podeReabrir = podeReabrirRegistro(m);
            const aguardandoLib = isAguardandoLiberacao(m);
            const aguardandoVinculo = isAguardandoVinculoCarga(m);

            return (
              <TableRow key={m.id} className={aguardandoVinculo ? "bg-destructive/10 hover:bg-destructive/15" : aguardandoLib ? "bg-amber-500/5" : emRota ? "" : minutos >= 480 ? "bg-destructive/5" : minutos >= 240 ? "bg-yellow-500/5" : ""}>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(new Date(m.data_hora), "HH:mm", { locale: ptBR })}
                  </div>
                </TableCell>
                <TableCell>
                  <div className={`flex items-center gap-1 text-sm ${emRota ? "text-muted-foreground" : getTempoClass(minutos)}`}>
                    {!emRota && minutos >= 480 && <AlertTriangle className="h-3 w-3" />}
                    {emRota ? `em rota há ${formatTempo(minutos)}` : formatTempo(minutos)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={categoriaBadgeColor[m.categoria] || ""}>
                      {getCategoriaLabel(m.categoria)}
                    </Badge>
                    {aguardandoVinculo && (
                      <Badge variant="outline" className="text-[10px] gap-0.5 border-destructive/60 bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-3 w-3" /> Aguardando vínculo
                      </Badge>
                    )}
                    {aguardandoLib && (
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        Aguardando Liberação
                      </Badge>
                    )}
                    {isCargaPropriaInconsistente(m) && (
                      <Badge variant="outline" className="text-[10px] gap-0.5 border-destructive/50 bg-destructive/10 text-destructive" title="Carga Própria sem horario_entrada — abra o registro e edite para corrigir.">
                        <AlertTriangle className="h-3 w-3" /> Estado inconsistente
                      </Badge>
                    )}
                    {m.categoria === "carga_propria" && m.tipo_movimento === "entrada" && !isFinalizada(m.etapa_carga_propria as any) && (() => {
                      const etapaEff = etapaEfetiva(m.etapa_carga_propria as any);
                      return (
                        <Badge variant={etapaEff === "em_rota" ? "outline" : "default"} className={`text-[10px] ${etapaEff === "chegou" ? "bg-orange-500 text-white" : etapaEff === "em_rota" ? "border-blue-500 text-blue-700 dark:text-blue-400" : "bg-yellow-500 text-white"}`}>
                          {etapaEff === "chegou" ? "Chegou" : etapaEff === "em_rota" ? "Em Rota" : "Retornou"}
                        </Badge>
                      );
                    })()}
                    {m.categoria === "terceirizado" && m.etapa_terceirizado === "no_patio" && (
                      <Badge variant="default" className="text-[10px] bg-emerald-600 text-white">
                        No Pátio
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono font-medium">{m.placa || "—"}</TableCell>
                <TableCell>{m.motorista || "—"}</TableCell>
                <TableCell className="text-sm max-w-[200px]">
                  <div className="truncate">{infoExtra || m.empresa || m.destino_setor || "—"}</div>
                  {m.categoria === "terceirizado" && (
                    <div className="text-[11px] text-muted-foreground flex gap-x-2 mt-0.5">
                      <span>Chegada: {format(new Date(m.horario_chegada || m.data_hora), "HH:mm")}</span>
                      {m.horario_entrada && <span>Entrada: {format(new Date(m.horario_entrada), "HH:mm")}</span>}
                      {m.horario_real_saida && <span>Saída: {format(new Date(m.horario_real_saida), "HH:mm")}</span>}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!readOnly && (
                  <div className="flex items-center gap-1 justify-end">
                  {aguardandoVinculo ? (
                    <>
                      {canVincular && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive" onClick={() => handleDesfazerChegada(m)} disabled={isSaving}>
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                          Desfazer
                        </Button>
                      )}
                      {canVincular && (
                        <Button size="sm" variant="default" className="gap-1 h-7 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => setVincularMov(m)} disabled={isSaving}>
                          <Link2 className="h-3 w-3" /> Vincular carga
                        </Button>
                      )}
                    </>
                  ) : aguardandoLib ? (
                    <Button size="sm" variant="default" className="gap-1 h-7 text-xs" onClick={() => handleLiberarEntrada(m)} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}
                      Liberar Entrada
                    </Button>
                  ) : m.categoria === "carga_propria" && m.etapa_carga_propria === "chegou" ? (
                    <>
                      <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs text-muted-foreground" onClick={() => setEditKmMov(m)} title="Editar KM">
                        <Gauge className="h-3 w-3" /> KM
                      </Button>
                      <Button size="sm" variant="default" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m, "saida_rota")}>
                        <ArrowUpFromLine className="h-3 w-3" /> Saída p/ Rota
                      </Button>
                    </>
                  ) : m.categoria === "carga_propria" && m.etapa_carga_propria === "em_rota" ? (
                    <>
                      <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs text-muted-foreground" onClick={() => setEditKmMov(m)} title="Editar KM">
                        <Gauge className="h-3 w-3" /> KM
                      </Button>
                      <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m, "retorno")}>
                        <ArrowDownToLine className="h-3 w-3" /> Retorno
                      </Button>
                    </>
                  ) : m.categoria === "carga_propria" && m.etapa_carga_propria === "retornou" ? (
                    <>
                      <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs text-muted-foreground" onClick={() => setEditKmMov(m)} title="Editar KM">
                        <Gauge className="h-3 w-3" /> KM
                      </Button>
                      <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m, "lacre")}>
                        <ArrowUpFromLine className="h-3 w-3" /> Saída c/ Lacre
                      </Button>
                    </>
                  ) : m.categoria === "carga_propria" ? (
                    <Button size="sm" variant="default" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m, "saida_rota")}>
                      <ArrowUpFromLine className="h-3 w-3" /> Saída p/ Rota
                    </Button>
                  ) : m.categoria === "terceirizado" || m.categoria === "fornecedor" ? (
                    isReabrir ? (
                      <div className="flex items-center gap-3 justify-end animate-in fade-in duration-200">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setReabrirId(null)} disabled={isSaving}>
                          Cancelar
                        </Button>
                        <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => handleReabrirRegistro(m)} disabled={isSaving}>
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                          Confirmar
                        </Button>
                      </div>
                    ) : (
                      <>
                        {podeReabrir && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-7 text-xs"
                            title="Enviar para Registro de Entrada para vincular carga"
                            onClick={() => setReabrirId(m.id)}
                          >
                            <Undo2 className="h-3 w-3" /> Enviar p/ Registro
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => onRegistrarSaida(m)}>
                          <ArrowUpFromLine className="h-3 w-3" /> Registrar Saída
                        </Button>
                      </>
                    )
                  ) : isSaidaRapida ? (
                    <div className="flex items-center gap-3 justify-end animate-in fade-in duration-200">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSaidaRapidaId(null)} disabled={isSaving}>
                        Cancelar
                      </Button>
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => handleSaidaRapida(m)} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpFromLine className="h-3 w-3" />}
                        Confirmar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => setSaidaRapidaId(m.id)}>
                        <ArrowUpFromLine className="h-3 w-3" /> Saída
                      </Button>
                    </div>
                  )
                  }
                  </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <VincularMovimentoCargaDialog
        open={!!vincularMov}
        onOpenChange={(o) => { if (!o) setVincularMov(null); }}
        movimento={vincularMov}
      />
      <EditarKmDialog
        open={!!editKmMov}
        onOpenChange={(o) => { if (!o) setEditKmMov(null); }}
        movimento={editKmMov}
      />
    </div>
  );
}
