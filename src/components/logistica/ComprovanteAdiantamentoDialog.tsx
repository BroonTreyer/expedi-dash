import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Printer, CheckCircle2, Paperclip, X, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  useMarcarAdiantamentoPago,
  useVincularTransportadora,
  useDesmarcarPago,
  useDesmarcarQuitado,
  useAtualizarDataPagamento,
  useAtualizarDataQuitacao,
  type Adiantamento,
  type AdiantamentoCte,
} from "@/hooks/useAdiantamentos";
import { useTransportadorasFinanceiro } from "@/hooks/useTransportadorasFinanceiro";
import { resolveTranspInfo, normalizaNomeTransp } from "@/lib/transportadora-match";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CteDacteRow } from "@/hooks/useCtesDacte";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { gerarTextoComprovante, gruposParaComprovante } from "@/lib/comprovante-texto";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  adiantamentos: Adiantamento[];
}

export function ComprovanteAdiantamentoDialog({ open, onOpenChange, adiantamentos }: Props) {
  const session = useSession();
  const { data: transp = [] } = useTransportadorasFinanceiro();
  const marcarPago = useMarcarAdiantamentoPago();
  const desmarcarPago = useDesmarcarPago();
  const desmarcarQuitado = useDesmarcarQuitado();
  const atualizarPago = useAtualizarDataPagamento();
  const atualizarQuit = useAtualizarDataQuitacao();

  // Busca CT-es de cada adiantamento em paralelo
  const ctesQueries = useQueries({
    queries: adiantamentos.map((a) => ({
      queryKey: ["adt_ctes", a.id],
      enabled: !!session && open,
      queryFn: async () => {
        const { data, error } = await (supabase as any)
          .from("adiantamentos_frete_ctes")
          .select("*, ctes_dacte(*)")
          .eq("adiantamento_id", a.id);
        if (error) throw error;
        return ((data ?? []) as any[]).map((r) => ({
          id: r.id,
          adiantamento_id: r.adiantamento_id,
          cte_id: r.cte_id,
          valor_frete: Number(r.valor_frete ?? 0),
          cte: r.ctes_dacte as CteDacteRow,
        })) as AdiantamentoCte[];
      },
    })),
  });


  const modoQuitacao =
    adiantamentos.length > 0 &&
    adiantamentos.every((a) => a.status === "pago" || a.status === "quitado");

  // Garante cteNumbers em cada adiantamento (a partir dos vínculos carregados)
  const adtsComCtes = useMemo<Adiantamento[]>(
    () =>
      adiantamentos.map((a, idx) => {
        if (a.cteNumbers && a.cteNumbers.length > 0) return a;
        const nums = ((ctesQueries[idx]?.data ?? []) as AdiantamentoCte[])
          .map((r) => r.cte?.numero_cte)
          .filter(Boolean) as string[];
        return nums.length ? { ...a, cteNumbers: nums } : a;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adiantamentos, ...ctesQueries.map((q) => q.data)],
  );

  const texto = useMemo(
    () =>
      gerarTextoComprovante({
        adiantamentos: adtsComCtes,
        modo: modoQuitacao ? "quitacao" : "adiantamento",
        transportadoras: transp,
      }),
    [adtsComCtes, transp, modoQuitacao],
  );
  const qtdOcs = useMemo(() => gruposParaComprovante(adtsComCtes).length, [adtsComCtes]);

  const [copied, setCopied] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [dataPagamento, setDataPagamento] = useState<string>(todayStr);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(texto);
    setCopied(true);
    toast.success("Texto copiado — cole no WhatsApp");
    setTimeout(() => setCopied(false), 2000);
  };

  // Hooks SEMPRE antes de qualquer early return.
  const vincular = useVincularTransportadora();
  const semVinculo = useMemo(() => {
    const map = new Map<string, { nome: string; ids: string[] }>();
    for (const a of adiantamentos) {
      const info = resolveTranspInfo(transp, a.transportadora_id, a.transportadora);
      if (info) continue;
      const key = normalizaNomeTransp(a.transportadora) || a.transportadora;
      const cur = map.get(key) ?? { nome: a.transportadora, ids: [] };
      cur.ids.push(a.id);
      map.set(key, cur);
    }
    return Array.from(map.values());
  }, [adiantamentos, transp]);

  if (adiantamentos.length === 0) return null;

  const pendentes = adiantamentos.filter((a) => a.status === "pendente");
  const jaPagos = adiantamentos.filter((a) => a.pago_em);

  const semPix = adiantamentos.some((a) => {
    const info = resolveTranspInfo(transp, a.transportadora_id, a.transportadora);
    return !info?.pix_chave;
  });

  const prefixo = modoQuitacao ? "Quitação" : "Comprovante";
  const titulo =
    adiantamentos.length === 1
      ? `${prefixo} — ${adiantamentos[0].numero}`
      : `${prefixo} — ${adiantamentos.length} adiantamentos · ${qtdOcs} OC(s)`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        <div className="border rounded-md p-4 bg-muted/30 font-mono text-sm whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-auto">
          {texto}
        </div>

        {semPix && (
          <p className="text-xs text-muted-foreground">
            Cadastre código e chave PIX em <strong>Transportadoras</strong> para que apareçam aqui.
          </p>
        )}

        {semVinculo.length > 0 && (
          <div className="border border-amber-300 bg-amber-50 rounded-md p-3 space-y-2">
            <p className="text-xs text-amber-900">
              Não encontramos esta transportadora no cadastro. Vincule manualmente
              para puxar código e PIX:
            </p>
            {semVinculo.map((g) => (
              <div key={g.nome} className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-amber-900 truncate max-w-[200px]">
                  {g.nome}
                </span>
                <Select
                  onValueChange={(id) =>
                    vincular.mutate({ ids: g.ids, transportadora_id: id })
                  }
                >
                  <SelectTrigger className="h-8 w-[260px] text-xs">
                    <SelectValue placeholder="Escolher transportadora cadastrada…" />
                  </SelectTrigger>
                  <SelectContent>
                    {transp.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.codigo ? `${t.codigo} – ${t.nome}` : t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        {pendentes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="data-pagamento" className="text-sm whitespace-nowrap">
                Data do pagamento
              </Label>
              <Input
                id="data-pagamento"
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Label htmlFor="comprovante-adt" className="text-sm whitespace-nowrap">
                Comprovante (opcional)
              </Label>
              <Input
                id="comprovante-adt"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > 5 * 1024 * 1024) {
                    toast.error("Arquivo maior que 5 MB");
                    e.target.value = "";
                    return;
                  }
                  setComprovante(f);
                }}
                className="w-auto text-xs"
              />
              {comprovante && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setComprovante(null)}
                  className="h-7 px-2"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {comprovante && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> {comprovante.name}
              </p>
            )}
          </div>
        )}
        {pendentes.length === 0 && jaPagos.length > 0 && (
          <div className="text-sm text-muted-foreground space-y-0.5">
            {jaPagos.length === 1 ? (
              <p>Pago em: {fmtDate(jaPagos[0].pago_em)}</p>
            ) : (
              jaPagos.map((a) => (
                <p key={a.id}>
                  {a.numero}: pago em {fmtDate(a.pago_em)}
                </p>
              ))
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={copy}>
            {copied ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />} Copiar texto
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
          {pendentes.length > 0 && (
            <Button
              onClick={async () => {
                try {
                  setUploading(true);
                  for (const a of pendentes) {
                    let comprovanteUrl: string | undefined;
                    if (comprovante) {
                      const ext = comprovante.name.split(".").pop() || "bin";
                      const path = `comprovantes-adt/${a.id}/${Date.now()}.${ext}`;
                      const { error: upErr } = await supabase.storage
                        .from("dacte")
                        .upload(path, comprovante, {
                          cacheControl: "3600",
                          upsert: false,
                          contentType: comprovante.type || undefined,
                        });
                      if (upErr) throw upErr;
                      comprovanteUrl = path;
                    }
                    await marcarPago.mutateAsync({
                      id: a.id,
                      pago_em: dataPagamento,
                      ...(comprovanteUrl ? { comprovante_pagamento_url: comprovanteUrl } : {}),
                    });
                  }
                  setComprovante(null);
                  onOpenChange(false);
                } catch (e: any) {
                  toast.error(e?.message ?? "Erro ao marcar como pago");
                } finally {
                  setUploading(false);
                }
              }}
              disabled={marcarPago.isPending || uploading}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {uploading
                ? "Enviando..."
                : pendentes.length === 1
                  ? "Marcar como pago"
                  : `Marcar ${pendentes.length} como pagos`}
            </Button>
          )}
          {(() => {
            const quitados = adiantamentos.filter((a) => a.status === "quitado");
            const pagosNaoQuitados = adiantamentos.filter((a) => a.status === "pago");
            const comPagoEm = adiantamentos.filter((a) => !!a.pago_em);
            const aplicarDataPago = async (dateStr: string) => {
              try {
                await Promise.all(comPagoEm.map((a) => atualizarPago.mutateAsync({ id: a.id, pago_em: dateStr })));
                if (comPagoEm.length > 1) toast.success(`Data de pagamento atualizada em ${comPagoEm.length} adiantamentos`);
              } catch {}
            };
            const aplicarDataQuit = async (dateStr: string) => {
              try {
                await Promise.all(quitados.map((a) => atualizarQuit.mutateAsync({ id: a.id, quitado_em: dateStr })));
                if (quitados.length > 1) toast.success(`Data de quitação atualizada em ${quitados.length} adiantamentos`);
              } catch {}
            };
            return (
              <>
                {comPagoEm.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        Editar data pagamento{comPagoEm.length > 1 ? ` (${comPagoEm.length})` : ""}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={comPagoEm[0].pago_em ? new Date(comPagoEm[0].pago_em) : undefined}
                        onSelect={(d) => {
                          if (!d) return;
                          const y = d.getFullYear();
                          const m = String(d.getMonth() + 1).padStart(2, "0");
                          const day = String(d.getDate()).padStart(2, "0");
                          aplicarDataPago(`${y}-${m}-${day}`);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                )}
                {quitados.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        Editar data quitação{quitados.length > 1 ? ` (${quitados.length})` : ""}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={quitados[0].quitado_em ? new Date(quitados[0].quitado_em) : undefined}
                        onSelect={(d) => {
                          if (!d) return;
                          const y = d.getFullYear();
                          const m = String(d.getMonth() + 1).padStart(2, "0");
                          const day = String(d.getDate()).padStart(2, "0");
                          aplicarDataQuit(`${y}-${m}-${day}`);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                )}
                {quitados.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const msg =
                        quitados.length === 1
                          ? `Desmarcar quitação do ${quitados[0].numero}? O saldo volta a ficar aberto.`
                          : `Desmarcar quitação de ${quitados.length} adiantamentos? O saldo volta a ficar aberto.`;
                      if (confirm(msg)) {
                        desmarcarQuitado.mutate(quitados.map((a) => a.id), {
                          onSuccess: () => onOpenChange(false),
                        });
                      }
                    }}
                    disabled={desmarcarQuitado.isPending}
                  >
                    <Undo2 className="h-4 w-4 mr-1" />
                    {quitados.length === 1 ? "Desmarcar quitado" : `Desmarcar ${quitados.length} quitados`}
                  </Button>
                )}
                {pagosNaoQuitados.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const msg =
                        pagosNaoQuitados.length === 1
                          ? `Desmarcar pagamento do ${pagosNaoQuitados[0].numero}? O comprovante anexado será removido do registro.`
                          : `Desmarcar pagamento de ${pagosNaoQuitados.length} adiantamentos? Os comprovantes anexados serão removidos dos registros.`;
                      if (confirm(msg)) {
                        desmarcarPago.mutate(pagosNaoQuitados.map((a) => a.id), {
                          onSuccess: () => onOpenChange(false),
                        });
                      }
                    }}
                    disabled={desmarcarPago.isPending}
                  >
                    <Undo2 className="h-4 w-4 mr-1" />
                    {pagosNaoQuitados.length === 1 ? "Desmarcar pago" : `Desmarcar ${pagosNaoQuitados.length} pagos`}
                  </Button>
                )}
              </>
            );
          })()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}