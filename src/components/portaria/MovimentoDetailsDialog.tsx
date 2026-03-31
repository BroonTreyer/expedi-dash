import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInMinutes, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2, Loader2, ArrowDownToLine, ArrowUpFromLine, CalendarCheck, CalendarClock, AlertTriangle } from "lucide-react";
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
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <img
        src={url}
        alt={alt}
        className="rounded-md w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity ring-1 ring-border"
        onClick={() => setViewerOpen(true)}
      />
      <PhotoViewerDialog open={viewerOpen} onOpenChange={setViewerOpen} url={url} alt={label} />
    </div>
  );
}

export function MovimentoDetailsDialog({ open, onOpenChange, movimento, movimentoSaida }: Props) {
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

  if (!movimento) return null;
  const m = movimento;
  const s = movimentoSaida;

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
  const kmInicial = m.km_inicial ?? s?.km_inicial;
  const kmFinal = s?.km_final ?? m.km_final;
  const kmRodado = s?.km_rodado ?? m.km_rodado ?? (kmInicial != null && kmFinal != null ? kmFinal - kmInicial : undefined);
  const kmRota = m.km_rota ?? s?.km_rota;
  
  const hasOperacao = m.rota || m.peso || m.qtd_entregas || kmRota || kmInicial || kmFinal || kmRodado || m.tipo_carga || m.nota_fiscal || m.doca_setor || m.apelido;
  const hasControle = m.responsavel_interno || m.conferente || m.ocorrencia || s?.conferente || s?.ocorrencia;
  
  // Collect all photos from both records
  const allPhotos: { url: string; alt: string; label: string; ocrText?: string | null; ocrConf?: number | null }[] = [];
  if (m.foto_placa_url) allPhotos.push({ url: m.foto_placa_url, alt: "Placa", label: "📥 Foto da Placa (Entrada)", ocrText: m.texto_placa_lido, ocrConf: m.confianca_placa });
  if (m.foto_documento_url) allPhotos.push({ url: m.foto_documento_url, alt: "Documento", label: "📥 Documento (Entrada)" });
  if (m.foto_painel_url) allPhotos.push({ url: m.foto_painel_url, alt: "Painel", label: "📥 Painel KM (Entrada)" });
  if (m.foto_nota_url) allPhotos.push({ url: m.foto_nota_url, alt: "Nota Fiscal", label: "📥 Nota Fiscal (Entrada)" });
  if (s?.foto_placa_url) allPhotos.push({ url: s.foto_placa_url, alt: "Placa", label: "📤 Foto da Placa (Saída)", ocrText: s.texto_placa_lido, ocrConf: s.confianca_placa });
  if (s?.foto_documento_url) allPhotos.push({ url: s.foto_documento_url, alt: "Documento", label: "📤 Documento (Saída)" });
  if (s?.foto_painel_url) allPhotos.push({ url: s.foto_painel_url, alt: "Painel", label: "📤 Painel KM (Saída)" });
  if (s?.foto_nota_url) allPhotos.push({ url: s.foto_nota_url, alt: "Nota Fiscal", label: "📤 Nota Fiscal (Saída)" });
  
  const hasFotos = allPhotos.length > 0;

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
              {m.tipo_movimento === "entrada" && (
                <Badge variant="default" className="gap-1">
                  <ArrowDownToLine className="h-3 w-3" /> Entrada
                </Badge>
              )}
              {(s || m.tipo_movimento === "saida") && (
                <Badge variant="secondary" className="gap-1">
                  <ArrowUpFromLine className="h-3 w-3" /> Saída
                </Badge>
              )}
              <Badge variant="outline">{getCategoriaLabel(m.categoria)}</Badge>
              {m.tipo_operacao && <Badge variant="outline" className="text-[11px]">{m.tipo_operacao}</Badge>}
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
              {m.tipo_movimento === "entrada" && (
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">Entrada:</span>
                  <strong>{format(new Date(m.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}</strong>
                </div>
              )}
              {s && (
                <>
                  <div className="flex items-center gap-2">
                    <ArrowUpFromLine className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Saída:</span>
                    <strong>{format(new Date(s.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}</strong>
                  </div>
                  {m.tipo_movimento === "entrada" && (() => {
                    const mins = differenceInMinutes(new Date(s.data_hora), new Date(m.data_hora));
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
              {!s && m.tipo_movimento === "saida" && (
                <div className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Saída:</span>
                  <strong>{format(new Date(m.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}</strong>
                </div>
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
                {s && (
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
                        <AlertDialogAction onClick={async () => { await deleteMov.mutateAsync(s.id); onOpenChange(false); }} disabled={deleteMov.isPending}>
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
              <DetailRow label="Setor" value={m.destino_setor ? getSetorLabel(m.destino_setor) : undefined} />
              {m.numero_lacre && <DetailRow label={s?.numero_lacre ? "Lacre (Entrada)" : "Nº Lacre"} value={m.numero_lacre} />}
              {s?.numero_lacre && <DetailRow label={m.numero_lacre ? "Lacre (Saída)" : "Nº Lacre"} value={s.numero_lacre} />}
              {!m.numero_lacre && !s?.numero_lacre ? null : null}
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
                  <DetailRow label="Nota Fiscal" value={m.nota_fiscal || s?.nota_fiscal} />
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
                  <DetailRow label="Conferente (Entrada)" value={m.conferente} />
                  {s?.conferente && <DetailRow label="Conferente (Saída)" value={s.conferente} />}
                  {m.ocorrencia && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Ocorrência:</span>
                      <p className="mt-0.5">{m.ocorrencia}</p>
                    </div>
                  )}
                  {s?.ocorrencia && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Ocorrência (Saída):</span>
                      <p className="mt-0.5">{s.ocorrencia}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Observações */}
            {(m.observacoes || s?.observacoes) && (
              <div className="text-sm space-y-1">
                {m.observacoes && (
                  <div>
                    <span className="text-muted-foreground">Observações{s?.observacoes ? " (Entrada)" : ""}:</span>
                    <p className="mt-1">{m.observacoes}</p>
                  </div>
                )}
                {s?.observacoes && (
                  <div>
                    <span className="text-muted-foreground">Observações (Saída):</span>
                    <p className="mt-1">{s.observacoes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Fotos */}
            {hasFotos && (
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
