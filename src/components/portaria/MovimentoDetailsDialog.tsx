import { useState, forwardRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInMinutes, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2, Loader2, ArrowDownToLine, ArrowUpFromLine, CalendarCheck, CalendarClock, AlertTriangle, FileText } from "lucide-react";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { CATEGORIAS, SETORES, useDeleteMovimentacao } from "@/hooks/useMovimentacoesPortaria";
import { useAuth } from "@/hooks/useAuth";
import { PhotoViewerDialog } from "./PhotoViewerDialog";
import { EditMovimentoDialog } from "./EditMovimentoDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  movimento: MovimentacaoPortaria | null;
  movimentoSaida?: MovimentacaoPortaria | null;
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <strong>{value}</strong>
    </div>
  );
}

function ClickablePhoto({ url, alt, label }: { url: string; alt: string; label: string }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('application/pdf');
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {isPdf ? (
        <div
          className="rounded-md w-full h-32 flex flex-col items-center justify-center gap-1.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors ring-1 ring-border"
          onClick={() => setViewerOpen(true)}
        >
          <FileText className="h-8 w-8 text-muted-foreground" />
          <span className="text-[10px] text-primary">Clique para visualizar</span>
        </div>
      ) : (
        <img
          src={url}
          alt={alt}
          className="rounded-md w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity ring-1 ring-border"
          onClick={() => setViewerOpen(true)}
        />
      )}
      <PhotoViewerDialog open={viewerOpen} onOpenChange={setViewerOpen} url={url} alt={label} />
    </div>
  );
}

export const MovimentoDetailsDialog = forwardRef<HTMLDivElement, Props>(
  function MovimentoDetailsDialog({ open, onOpenChange, movimento, movimentoSaida }, _ref) {
  const { role } = useAuth();
  const deleteMov = useDeleteMovimentacao();
  const [editOpen, setEditOpen] = useState(false);
  const isAdmin = role === "admin";

  const placaBusca = movimento?.placa?.trim().toUpperCase() || "";
  const dataMovimento = movimento?.data_hora ? new Date(movimento.data_hora).toISOString().slice(0, 10) : "";
  const { data: veiculoEsperado } = useQuery({
    queryKey: ["veiculo-esperado-detalhe", placaBusca, dataMovimento],
    queryFn: async () => {
      if (!placaBusca || !dataMovimento) return null;
      // Search in a ±3 day window around the movement date
      const dMov = new Date(dataMovimento + "T00:00:00");
      const dFrom = new Date(dMov); dFrom.setDate(dFrom.getDate() - 3);
      const dTo = new Date(dMov); dTo.setDate(dTo.getDate() + 3);
      const { data, error } = await supabase
        .from("veiculos_esperados")
        .select("data_referencia")
        .ilike("placa", placaBusca)
        .gte("data_referencia", dFrom.toISOString().slice(0, 10))
        .lte("data_referencia", dTo.toISOString().slice(0, 10))
        .order("data_referencia", { ascending: true })
        .limit(1);
      if (error) {
        console.error("Erro ao buscar veículo esperado:", error);
        return null;
      }
      return data?.[0] || null;
    },
    enabled: !!placaBusca && !!dataMovimento && open,
  });

  // Fetch all related movement records for this vehicle/load to aggregate ALL photos
  const categoriaBusca = movimento?.categoria || "";
  const cargaIdBusca = movimento?.carga_id || "";
  const { data: relatedRecords } = useQuery({
    queryKey: ["mov-related-photos", placaBusca, categoriaBusca, cargaIdBusca, dataMovimento],
    enabled: open && !!placaBusca && !!categoriaBusca && !!dataMovimento,
    queryFn: async () => {
      const dMov = new Date(dataMovimento + "T00:00:00");
      const windowDays = categoriaBusca === "carga_propria" ? 2 : 1;
      const dFrom = new Date(dMov); dFrom.setDate(dFrom.getDate() - windowDays);
      const dTo = new Date(dMov); dTo.setDate(dTo.getDate() + windowDays);
      let q = supabase
        .from("movimentacoes_portaria")
        .select("id, tipo_movimento, etapa_carga_propria, etapa_terceirizado, foto_placa_url, foto_documento_url, foto_painel_url, foto_painel_saida_url, foto_nota_url, foto_lacre_url, texto_placa_lido, confianca_placa, data_hora, carga_id, categoria, placa")
        .ilike("placa", placaBusca)
        .eq("categoria", categoriaBusca)
        .gte("data_hora", dFrom.toISOString())
        .lte("data_hora", dTo.toISOString())
        .order("data_hora", { ascending: true });
      const { data, error } = await q;
      if (error) {
        console.error("Erro ao buscar registros relacionados:", error);
        return [];
      }
      let rows = data || [];
      // If we have a carga_id, prefer rows from same carga (or without carga_id, which may be early walk-ins)
      if (cargaIdBusca) {
        const filtered = rows.filter((r: any) => !r.carga_id || r.carga_id === cargaIdBusca);
        if (filtered.length > 0) rows = filtered;
      }
      return rows;
    },
  });

  if (!movimento) return null;
  const m = movimento;
  const s = movimentoSaida;
  const isCargaPropria = m.categoria === "carga_propria";
  // Carga Própria usa um único registro (m e s podem apontar para o mesmo objeto)
  const isSameRecord = !!s && s.id === m.id;
  const sDistinct = !isSameRecord ? s : undefined;

  // Compute date badge
  let dataBadge: { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode } | null = null;
  if (veiculoEsperado?.data_referencia && m.data_hora) {
    const dataRef = startOfDay(parseISO(veiculoEsperado.data_referencia));
    const dataEntrada = startOfDay(new Date(m.data_hora));
    const formattedRef = format(dataRef, "dd/MM", { locale: ptBR });
    if (dataEntrada.getTime() === dataRef.getTime()) {
      dataBadge = { label: `No prazo ${formattedRef}`, variant: "default", icon: <CalendarCheck className="h-3 w-3" /> };
    } else if (dataEntrada < dataRef) {
      dataBadge = { label: `Antecipado ${formattedRef}`, variant: "outline", icon: <CalendarClock className="h-3 w-3" /> };
    } else {
      dataBadge = { label: `Atrasado ${formattedRef}`, variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> };
    }
  }
  const getCategoriaLabel = (val: string) => CATEGORIAS.find((c) => c.value === val)?.label || val;
  const getSetorLabel = (val: string) => SETORES.find((ss) => ss.value === val)?.label || val;

  const hasIdentificacao = m.nome_completo || m.documento || m.telefone || m.pessoa_visitada || m.motivo_visita || m.servico_executar || m.descricao || m.tipo_operacao;
  
  // Combine operação from both records
  const kmInicial = m.km_inicial ?? sDistinct?.km_inicial;
  const kmFinal = sDistinct?.km_final ?? m.km_final;
  const kmRodado = sDistinct?.km_rodado ?? m.km_rodado ?? (kmInicial != null && kmFinal != null ? kmFinal - kmInicial : undefined);
  const kmRota = m.km_rota ?? sDistinct?.km_rota;
  
  const hasOperacao = m.rota || m.peso || m.qtd_entregas || kmRota || kmInicial || kmFinal || kmRodado || m.tipo_carga || m.nota_fiscal || m.doca_setor || m.apelido;
  const hasControle = m.responsavel_interno || m.conferente || m.ocorrencia || sDistinct?.conferente || sDistinct?.ocorrencia;
  
  // Helpers to derive stage labels
  const labelEtapaCP = (etapa: string | null | undefined) => {
    switch (etapa) {
      case "chegou": return "Chegada";
      case "em_rota": return "Saída p/ Rota";
      case "retornou": return "Retorno";
      case "finalizado": return "Saída Final";
      default: return null;
    }
  };
  const labelEtapaTerc = (etapa: string | null | undefined, tipo: string) => {
    if (etapa === "no_patio") return "No Pátio";
    if (etapa === "finalizado") return "Saída";
    return tipo === "saida" ? "Saída" : "Entrada";
  };

  // Collect all photos — aggregate from all related records, dedup by URL
  const allPhotos: { url: string; alt: string; label: string; ocrText?: string | null; ocrConf?: number | null }[] = [];
  {
    const seenUrls = new Set<string>();
    const pushPhoto = (url: string | null | undefined, alt: string, label: string, ocrText?: string | null, ocrConf?: number | null) => {
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);
      allPhotos.push({ url, alt, label, ocrText, ocrConf });
    };

    // Build the source list: all related records if available, else fallback to m + sDistinct
    const sources: any[] = (relatedRecords && relatedRecords.length > 0)
      ? relatedRecords
      : [m, sDistinct].filter(Boolean);

    for (const r of sources) {
      let stageLabel: string | null = null;
      let prefix = "";
      if (isCargaPropria) {
        stageLabel = labelEtapaCP(r.etapa_carga_propria) || (r.tipo_movimento === "saida" ? "Saída" : "Chegada");
        prefix = "";
      } else if (m.categoria === "terceirizado") {
        stageLabel = labelEtapaTerc(r.etapa_terceirizado, r.tipo_movimento);
        prefix = r.tipo_movimento === "saida" ? "📤 " : "📥 ";
      } else {
        stageLabel = r.tipo_movimento === "saida" ? "Saída" : "Entrada";
        prefix = r.tipo_movimento === "saida" ? "📤 " : "📥 ";
      }
      const suffix = stageLabel ? ` (${stageLabel})` : "";
      pushPhoto(r.foto_placa_url, "Placa", `${prefix}📷 Foto da Placa${suffix}`, r.texto_placa_lido, r.confianca_placa);
      pushPhoto(r.foto_documento_url, "Documento", `${prefix}📄 Documento${suffix}`);
      if (isCargaPropria) {
        pushPhoto(r.foto_painel_saida_url, "Painel KM (Saída)", `🛞 Painel KM (Saída p/ Rota)`);
        pushPhoto(r.foto_painel_url, "Painel KM (Retorno)", `🛞 Painel KM (Retorno)`);
      } else {
        pushPhoto(r.foto_painel_url, "Painel KM", `${prefix}🛞 Painel KM${suffix}`);
      }
      pushPhoto(r.foto_nota_url, "Nota Fiscal", `${prefix}📋 Nota Fiscal${suffix}`);
      pushPhoto(r.foto_lacre_url, "Lacre", `🔒 Foto do Lacre${suffix}`);
    }

    // Defensive: also pull from `s` (saída paired record) even if not in relatedRecords
    if (s) {
      const stage = isCargaPropria
        ? (labelEtapaCP(s.etapa_carga_propria) || "Saída")
        : m.categoria === "terceirizado"
          ? labelEtapaTerc(s.etapa_terceirizado, s.tipo_movimento)
          : "Saída";
      const suffix = ` (${stage})`;
      pushPhoto(s.foto_placa_url, "Placa", `📤 📷 Foto da Placa${suffix}`, s.texto_placa_lido, s.confianca_placa);
      pushPhoto(s.foto_documento_url, "Documento", `📤 📄 Documento${suffix}`);
      if (isCargaPropria) {
        pushPhoto((s as any).foto_painel_saida_url, "Painel KM (Saída)", `🛞 Painel KM (Saída p/ Rota)`);
        pushPhoto(s.foto_painel_url, "Painel KM (Retorno)", `🛞 Painel KM (Retorno)`);
      } else {
        pushPhoto(s.foto_painel_url, "Painel KM", `📤 🛞 Painel KM${suffix}`);
      }
      pushPhoto(s.foto_nota_url, "Nota Fiscal", `📤 📋 Nota Fiscal${suffix}`);
      pushPhoto(s.foto_lacre_url, "Lacre", `🔒 Foto do Lacre${suffix}`);
    }
  }
  
  const hasFotos = allPhotos.length > 0;

  // For Carga Própria: track which painel KM photos are missing so we can show explicit placeholders
  const cpMissing: { label: string; reason: string }[] = [];
  if (isCargaPropria) {
    const allSources: any[] = [
      ...((relatedRecords && relatedRecords.length > 0) ? relatedRecords : [m, sDistinct].filter(Boolean)),
      ...(s ? [s] : []),
    ];
    const hasSaida = allSources.some((r: any) => !!r?.foto_painel_saida_url);
    const hasRetorno = allSources.some((r: any) => !!r?.foto_painel_url);
    const etapa = m.etapa_carga_propria;
    // Show "Saída" placeholder once the vehicle has left to route or beyond
    if (!hasSaida && (etapa === "em_rota" || etapa === "retornou" || etapa === "finalizado")) {
      cpMissing.push({ label: "🛞 Painel KM (Saída p/ Rota)", reason: "Não capturada nesta saída" });
    }
    // Show "Retorno" placeholder once the vehicle has returned
    if (!hasRetorno && (etapa === "retornou" || etapa === "finalizado")) {
      cpMissing.push({ label: "🛞 Painel KM (Retorno)", reason: "Não capturada no retorno" });
    }
  }

  const handleDelete = async () => {
    await deleteMov.mutateAsync(m.id);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Movimento</DialogTitle>
            <DialogDescription className="sr-only">Informações detalhadas do registro de portaria</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Header badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {!isCargaPropria && m.tipo_movimento === "entrada" && (
                <Badge variant="default" className="gap-1">
                  <ArrowDownToLine className="h-3 w-3" /> Entrada
                </Badge>
              )}
              {!isCargaPropria && (sDistinct || m.tipo_movimento === "saida") && (
                <Badge variant="secondary" className="gap-1">
                  <ArrowUpFromLine className="h-3 w-3" /> Saída
                </Badge>
              )}
              <Badge variant="outline">{getCategoriaLabel(m.categoria)}</Badge>
              {m.categoria === "carga_propria" && m.etapa_carga_propria && (
                <Badge variant="outline" className={`text-[11px] ${m.etapa_carga_propria === "em_rota" ? "border-blue-500 text-blue-700 dark:text-blue-400" : m.etapa_carga_propria === "retornou" ? "border-yellow-500 text-yellow-700 dark:text-yellow-400" : "border-green-500 text-green-700 dark:text-green-400"}`}>
                  {m.etapa_carga_propria === "em_rota" ? "🔵 Em Rota" : m.etapa_carga_propria === "retornou" ? "🟡 Retornou" : "✅ Finalizado"}
                </Badge>
              )}
              {m.tipo_operacao && <Badge variant="outline" className="text-[11px]">{m.tipo_operacao}</Badge>}
              {(m.observacoes?.includes("[REGULARIZADO") || sDistinct?.observacoes?.includes("[REGULARIZADO")) && (
                <Badge variant="outline" className="gap-1 text-[11px] border-amber-500 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" /> Regularizado
                </Badge>
              )}
              {(m.observacoes?.includes("[FOTO via upload") || sDistinct?.observacoes?.includes("[FOTO via upload")) && (
                <Badge variant="outline" className="gap-1 text-[11px] border-sky-500 text-sky-700 dark:text-sky-400">
                  <AlertTriangle className="h-3 w-3" /> Foto via upload
                </Badge>
              )}
              {dataBadge && (
                <Badge
                  variant={dataBadge.variant}
                  className={`gap-1 text-[11px] ${dataBadge.variant === "outline" ? "border-yellow-500 text-yellow-700 dark:text-yellow-400" : ""} ${dataBadge.variant === "default" ? "bg-green-600 hover:bg-green-600/80 text-white" : ""}`}
                >
                  {dataBadge.icon} {dataBadge.label}
                </Badge>
              )}
            </div>

            {/* Horários */}
            <div className="rounded-md bg-muted/50 p-2.5 text-sm space-y-1">
              {isCargaPropria ? (
                (() => {
                  const fmtDate = (d: string) => format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
                  const fmtDur = (mins: number) => { const h = Math.floor(mins / 60); const min = mins % 60; return h > 0 ? `${h}h ${min}min` : `${min}min`; };
                  const chegada = m.horario_chegada || m.data_hora;
                  const saidaRota = m.horario_real_saida;
                  const retorno = m.horario_real_retorno;
                  const saidaFinal = (m as any).horario_saida_final as string | null;
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-orange-500">🟠</span>
                        <span className="text-muted-foreground">Chegada:</span>
                        <strong>{fmtDate(chegada)}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowUpFromLine className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-muted-foreground">Saída p/ Rota:</span>
                        <strong>{saidaRota ? fmtDate(saidaRota) : "—"}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowDownToLine className="h-3.5 w-3.5 text-yellow-600" />
                        <span className="text-muted-foreground">Retorno:</span>
                        <strong>{retorno ? fmtDate(retorno) : "—"}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🔒</span>
                        <span className="text-muted-foreground">Saída Final (Lacre):</span>
                        <strong>{saidaFinal ? fmtDate(saidaFinal) : "—"}</strong>
                      </div>
                      {saidaRota && retorno && (
                        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                          <span className="text-muted-foreground">⏱ Tempo em Rota:</span>
                          <strong>{fmtDur(differenceInMinutes(new Date(retorno), new Date(saidaRota)))}</strong>
                        </div>
                      )}
                      {retorno && saidaFinal && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">⏱ Pátio (Retorno → Lacre):</span>
                          <strong>{fmtDur(differenceInMinutes(new Date(saidaFinal), new Date(retorno)))}</strong>
                        </div>
                      )}
                    </>
                  );
                })()
              ) : m.categoria === "terceirizado" ? (
                (() => {
                  const chegada = m.horario_chegada || m.data_hora;
                  const entrada = m.horario_entrada;
                  const saida = m.horario_real_saida || (s ? s.data_hora : null);
                  const fmtDate = (d: string) => format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
                  const fmtDur = (mins: number) => { const h = Math.floor(mins / 60); const min = mins % 60; return h > 0 ? `${h}h ${min}min` : `${min}min`; };
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-500">🟡</span>
                        <span className="text-muted-foreground">Chegada:</span>
                        <strong>{fmtDate(chegada)}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">🟢</span>
                        <span className="text-muted-foreground">Entrada Liberada:</span>
                        <strong>{entrada ? fmtDate(entrada) : "—"}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowUpFromLine className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Saída:</span>
                        <strong>{saida ? fmtDate(saida) : "—"}</strong>
                      </div>
                      {entrada && (
                        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                          <span className="text-muted-foreground">⏱ Espera (Chegada → Entrada):</span>
                          <strong>{fmtDur(differenceInMinutes(new Date(entrada), new Date(chegada)))}</strong>
                        </div>
                      )}
                      {saida && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">⏱ Tempo Total:</span>
                          <strong>{fmtDur(differenceInMinutes(new Date(saida), new Date(chegada)))}</strong>
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                <>
                  {m.tipo_movimento === "entrada" && (
                    <div className="flex items-center gap-2">
                      <ArrowDownToLine className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">Entrada:</span>
                      <strong>{format(new Date(m.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}</strong>
                    </div>
                  )}
                  {sDistinct && (
                    <>
                      <div className="flex items-center gap-2">
                        <ArrowUpFromLine className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Saída:</span>
                        <strong>{format(new Date(sDistinct.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}</strong>
                      </div>
                      {m.tipo_movimento === "entrada" && (() => {
                        const mins = differenceInMinutes(new Date(sDistinct.data_hora), new Date(m.data_hora));
                        const h = Math.floor(mins / 60);
                        const min = mins % 60;
                        return (
                          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                            <span className="text-muted-foreground">⏱ Tempo Gasto:</span>
                            <strong>{h > 0 ? `${h}h ${min}min` : `${min}min`}</strong>
                          </div>
                        );
                      })()}
                    </>
                  )}
                  {!sDistinct && m.tipo_movimento === "saida" && (
                    <div className="flex items-center gap-2">
                      <ArrowUpFromLine className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Saída:</span>
                      <strong>{format(new Date(m.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}</strong>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Admin actions */}
            {isAdmin && (
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1.5 text-xs">
                      <Trash2 className="h-3 w-3" /> Excluir Tudo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este registro (entrada + saída)? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={deleteMov.isPending}>
                        {deleteMov.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {sDistinct && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                        <Trash2 className="h-3 w-3" /> Excluir Saída
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir apenas a saída?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso remove apenas o registro de saída. A entrada permanecerá e o veículo voltará ao pátio.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => { await deleteMov.mutateAsync(sDistinct.id); onOpenChange(false); }} disabled={deleteMov.isPending}>
                          {deleteMov.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Excluir Saída
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}

            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailRow label="Placa" value={m.placa ? m.placa : "—"} />
              <DetailRow label="Motorista" value={m.motorista} />
              <DetailRow label="Empresa" value={m.empresa} />
              <DetailRow label="Tipo de Veículo" value={m.tipo_caminhao} />
              <DetailRow label="Setor" value={m.destino_setor ? getSetorLabel(m.destino_setor) : undefined} />
              {m.numero_lacre && <DetailRow label={sDistinct?.numero_lacre ? "Lacre (Entrada)" : "Nº Lacre"} value={m.numero_lacre} />}
              {sDistinct?.numero_lacre && <DetailRow label={m.numero_lacre ? "Lacre (Saída)" : "Nº Lacre"} value={sDistinct.numero_lacre} />}
              <DetailRow label="Carga" value={m.carga_id} />
            </div>

            {/* Identificação */}
            {hasIdentificacao && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🏷️ Identificação</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <DetailRow label="Nome" value={m.nome_completo} />
                  <DetailRow label="Documento" value={m.documento} />
                  <DetailRow label="Telefone" value={m.telefone} />
                  <DetailRow label="Pessoa Visitada" value={m.pessoa_visitada} />
                  <DetailRow label="Motivo da Visita" value={m.motivo_visita} />
                  <DetailRow label="Serviço" value={m.servico_executar} />
                  {m.descricao && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Descrição:</span>
                      <p className="mt-0.5">{m.descricao}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Operação */}
            {hasOperacao && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📊 Operação</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <DetailRow label="Apelido" value={m.apelido} />
                  <DetailRow label="Rota" value={m.rota} />
                  <DetailRow label="Peso" value={m.peso ? `${m.peso} kg` : undefined} />
                  <DetailRow label="Entregas" value={m.qtd_entregas} />
                  <DetailRow label="KM Rota" value={kmRota} />
                  <DetailRow label="KM Inicial" value={kmInicial} />
                  <DetailRow label="KM Final" value={kmFinal} />
                  <DetailRow label="KM Rodado" value={kmRodado} />
                  <DetailRow label="Tipo de Carga" value={m.tipo_carga} />
                  <DetailRow label="Nota Fiscal" value={m.nota_fiscal || sDistinct?.nota_fiscal} />
                  <DetailRow label="Doca/Setor" value={m.doca_setor} />
                </div>
                {kmRodado != null && kmRota != null && (
                  <div className="rounded-md bg-muted/50 p-2 text-sm">
                    <span className="text-muted-foreground">Diferença KM: </span>
                    <span className="font-semibold">{Math.abs(kmRodado - kmRota).toFixed(0)} km</span>
                    {kmRodado > kmRota && <span className="text-yellow-600 dark:text-yellow-400 ml-1">(acima da rota)</span>}
                  </div>
                )}
              </div>
            )}

            {/* Controle */}
            {hasControle && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🔐 Controle</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <DetailRow label="Responsável" value={m.responsavel_interno} />
                  <DetailRow label={sDistinct?.conferente ? "Conferente (Entrada)" : "Conferente"} value={m.conferente} />
                  {sDistinct?.conferente && <DetailRow label="Conferente (Saída)" value={sDistinct.conferente} />}
                  {m.ocorrencia && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Ocorrência:</span>
                      <p className="mt-0.5">{m.ocorrencia}</p>
                    </div>
                  )}
                  {sDistinct?.ocorrencia && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Ocorrência (Saída):</span>
                      <p className="mt-0.5">{sDistinct.ocorrencia}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Observações */}
            {(m.observacoes || sDistinct?.observacoes) && (
              <div className="text-sm space-y-1">
                {m.observacoes && (
                  <div>
                    <span className="text-muted-foreground">Observações{sDistinct?.observacoes ? " (Entrada)" : ""}:</span>
                    <p className="mt-1">{m.observacoes}</p>
                  </div>
                )}
                {sDistinct?.observacoes && (
                  <div>
                    <span className="text-muted-foreground">Observações (Saída):</span>
                    <p className="mt-1">{sDistinct.observacoes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Fotos */}
            {(hasFotos || cpMissing.length > 0) && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📸 Evidências <span className="font-normal text-[10px]">(clique para ampliar)</span></h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allPhotos.map((photo, i) => (
                    <div key={i}>
                      <ClickablePhoto url={photo.url} alt={photo.alt} label={photo.label} />
                      {photo.ocrText && (
                        <p className="text-xs mt-1">OCR: <strong>{photo.ocrText}</strong> ({photo.ocrConf}%)</p>
                      )}
                    </div>
                  ))}
                  {cpMissing.map((miss, i) => (
                    <div key={`miss-${i}`}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{miss.label}</p>
                      <div className="rounded-md w-full h-32 flex flex-col items-center justify-center gap-1 bg-muted/30 ring-1 ring-dashed ring-border">
                        <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">{miss.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <EditMovimentoDialog open={editOpen} onOpenChange={setEditOpen} movimento={movimento} />
    </>
  );
}
