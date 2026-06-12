import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Printer, CheckCircle2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { useMarcarAdiantamentoPago, useVincularTransportadora, type Adiantamento, type AdiantamentoCte } from "@/hooks/useAdiantamentos";
import { useTransportadorasFinanceiro } from "@/hooks/useTransportadorasFinanceiro";
import { resolveTranspInfo, normalizaNomeTransp } from "@/lib/transportadora-match";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CteDacteRow } from "@/hooks/useCtesDacte";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtKg = (n: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n || 0);
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

  // Coleta carga_ids únicos para buscar nome_carga
  const cargaIds = useMemo(() => {
    const set = new Set<string>();
    ctesQueries.forEach((q) => {
      (q.data ?? []).forEach((r) => {
        const cid = r.cte?.carga_id;
        if (cid) set.add(cid);
      });
    });
    return Array.from(set);
  }, [ctesQueries]);

  const { data: nomesCargas = {} } = useQuery({
    queryKey: ["adt_nomes_cargas", cargaIds.sort().join(",")],
    enabled: !!session && open && cargaIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("carregamentos_dia")
        .select("carga_id, nome_carga")
        .in("carga_id", cargaIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of (data ?? []) as any[]) {
        if (r.carga_id && r.nome_carga && !map[r.carga_id]) map[r.carga_id] = r.nome_carga;
      }
      return map;
    },
    staleTime: 60_000,
  });

  // Peso real do romaneio por carga_id (soma de carregamentos_dia.peso)
  const { data: pesosRomaneio = {} } = useQuery({
    queryKey: ["adt_pesos_romaneio", cargaIds.sort().join(",")],
    enabled: !!session && open && cargaIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("carregamentos_dia")
        .select("carga_id, peso, peso_original")
        .in("carga_id", cargaIds);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of (data ?? []) as any[]) {
        if (!r.carga_id) continue;
        const p = Number(r.peso ?? r.peso_original ?? 0) || 0;
        map[r.carga_id] = (map[r.carga_id] ?? 0) + p;
      }
      return map;
    },
    staleTime: 60_000,
  });

  const totalCtes = adiantamentos.reduce((s, a) => s + (a.valor_total_ctes || 0), 0);
  const totalAdt = adiantamentos.reduce((s, a) => s + (a.valor_adiantamento || 0), 0);
  const totalSaldo = adiantamentos.reduce((s, a) => s + Number(a.valor_saldo || 0), 0);
  const percentuaisDistintos = Array.from(new Set(adiantamentos.map((a) => a.percentual)));
  const percUnico = percentuaisDistintos.length === 1 ? percentuaisDistintos[0] : null;

  const modoQuitacao =
    adiantamentos.length > 0 &&
    adiantamentos.every((a) => a.status === "pago" || a.status === "quitado");

  const ordCte = (a: string, b: string) => {
    const na = parseInt(String(a).replace(/\D/g, ""), 10);
    const nb = parseInt(String(b).replace(/\D/g, ""), 10);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  };

  // Agrega TODOS os CTEs (de todos os adiantamentos selecionados) por transportadora → carga.
  // Peso vem do romaneio (carregamentos_dia) quando disponível; fallback = soma do peso_total dos CTEs.
  const agregarPorTransportadora = () => {
    type Grupo = {
      key: string;
      label: string;
      cargaId: string | null;
      valor: number;
      pesoCtes: number;
      numerosSet: Set<string>;
    };
    type Bloco = {
      transportadora_id: string | null;
      transportadora: string;
      grupos: Map<string, Grupo>;
    };
    const blocos = new Map<string, Bloco>();
    adiantamentos.forEach((a, idx) => {
      const ctes = (ctesQueries[idx]?.data ?? []) as AdiantamentoCte[];
      const bkey = a.transportadora_id ?? `nome:${a.transportadora}`;
      const bloco =
        blocos.get(bkey) ?? {
          transportadora_id: a.transportadora_id ?? null,
          transportadora: a.transportadora,
          grupos: new Map<string, Grupo>(),
        };
      for (const r of ctes) {
        const cte = r.cte;
        const cid = cte?.carga_id ?? null;
        const oc = cte?.ordem_carga ?? null;
        const key = cid ?? (oc ? `oc:${oc}` : "sem");
        const label = (cid && nomesCargas[cid]) || oc || "Sem carga";
        const g =
          bloco.grupos.get(key) ??
          ({
            key,
            label,
            cargaId: cid,
            valor: 0,
            pesoCtes: 0,
            numerosSet: new Set<string>(),
          } as Grupo);
        g.valor += Number(r.valor_frete ?? cte?.valor_frete ?? 0);
        g.pesoCtes += Number(cte?.peso_total ?? 0);
        if (cte?.numero_cte) g.numerosSet.add(cte.numero_cte);
        bloco.grupos.set(key, g);
      }
      blocos.set(bkey, bloco);
    });
    return Array.from(blocos.values()).map((b) => ({
      transportadora_id: b.transportadora_id,
      transportadora: b.transportadora,
      grupos: Array.from(b.grupos.values()).map((g) => {
        const pesoRom = g.cargaId ? Number(pesosRomaneio[g.cargaId] ?? 0) : 0;
        const peso = pesoRom > 0 ? pesoRom : g.pesoCtes;
        return {
          label: g.label,
          valor: g.valor,
          peso,
          numerosStr: Array.from(g.numerosSet).sort(ordCte).join("/"),
        };
      }),
    }));
  };

  // Lista única de transportadoras (para bloco Pix), preservando ordem de aparição
  const transportadorasUnicas = () => {
    const seen = new Set<string>();
    const out: { transportadora_id: string | null; nomeFallback: string }[] = [];
    for (const a of adiantamentos) {
      const k = a.transportadora_id ?? `nome:${a.transportadora}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ transportadora_id: a.transportadora_id ?? null, nomeFallback: a.transportadora });
    }
    return out;
  };

  const texto = useMemo(() => {
    if (adiantamentos.length === 0) return "";
    let contador = 0;
    const blocos = agregarPorTransportadora();
    const pixList = transportadorasUnicas();
    const renderPix = (linhas: string[]) => {
      for (const t of pixList) {
        const info = resolveTranspInfo(transp, t.transportadora_id, t.nomeFallback);
        linhas.push(info?.codigo ? `Código ${info.codigo} – ${info.nome}` : t.nomeFallback);
        if (info?.pix_chave) linhas.push(`Pix: ${info.pix_chave}`);
      }
    };

    if (modoQuitacao) {
      const linhas: string[] = ["QUITAÇÃO DO FRETE CIF, FORA DO ESTADO.", ""];
      for (const b of blocos) {
        linhas.push(b.transportadora);
        for (const g of b.grupos) {
          contador += 1;
          linhas.push(
            `${contador}. ${g.label} (${fmtKg(g.peso)} KG)  CTE ${g.numerosStr}    VLR ${fmtBRL(g.valor)}`,
          );
        }
        // Resumos por adiantamento desta transportadora (mantém rastreabilidade)
        const adtsDaTransp = adiantamentos.filter(
          (a) => (a.transportadora_id ?? `nome:${a.transportadora}`) ===
            (b.transportadora_id ?? `nome:${b.transportadora}`),
        );
        for (const a of adtsDaTransp) {
          linhas.push(
            `Adt pago: *${fmtBRL(a.valor_adiantamento)}* (${a.percentual}%) — Saldo: *${fmtBRL(Number(a.valor_saldo || 0))}*`,
          );
        }
        linhas.push("");
      }
      linhas.push(`*Valor Total do Frete ${fmtBRL(totalCtes)}*`);
      linhas.push(`*Total Adt pago ${fmtBRL(totalAdt)}*`);
      linhas.push(`*Saldo a Quitar ${fmtBRL(totalSaldo)}*`, "");
      renderPix(linhas);
      return linhas.join("\n");
    }
    const linhas: string[] = ["ADIANTAMENTO DE FRETE CIF, FORA DO ESTADO.", ""];
    for (const b of blocos) {
      linhas.push(b.transportadora);
      for (const g of b.grupos) {
        contador += 1;
        linhas.push(
          `${contador}. ${g.label} (${fmtKg(g.peso)} KG)  CTE ${g.numerosStr}    VLR ${fmtBRL(g.valor)}`,
        );
      }
      if (percUnico === null) {
        const adtsDaTransp = adiantamentos.filter(
          (a) => (a.transportadora_id ?? `nome:${a.transportadora}`) ===
            (b.transportadora_id ?? `nome:${b.transportadora}`),
        );
        for (const a of adtsDaTransp) {
          linhas.push(`${a.percentual}% Adt = *${fmtBRL(a.valor_adiantamento)}*`);
        }
      }
      linhas.push("");
    }
    linhas.push(`*Valor Total do Frete ${fmtBRL(totalCtes)}*`, "");
    if (percUnico !== null) {
      linhas.push(`${percUnico}% de Adiantamento`, "", `*${fmtBRL(totalAdt)}*`, "");
    } else {
      linhas.push(`*Total Adiantamento ${fmtBRL(totalAdt)}*`, "");
    }
    renderPix(linhas);
    return linhas.join("\n");
  }, [adiantamentos, ctesQueries, transp, totalCtes, totalAdt, totalSaldo, percUnico, modoQuitacao, nomesCargas, pesosRomaneio]);

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

  if (adiantamentos.length === 0) return null;

  const pendentes = adiantamentos.filter((a) => a.status === "pendente");
  const jaPagos = adiantamentos.filter((a) => a.pago_em);
  const semPix = adiantamentos.some((a) => {
    const info = transp.find((t) => t.id === a.transportadora_id);
    return !info?.pix_chave;
  });

  const prefixo = modoQuitacao ? "Quitação" : "Comprovante";
  const titulo =
    adiantamentos.length === 1
      ? `${prefixo} — ${adiantamentos[0].numero}`
      : `${prefixo} — ${adiantamentos.length} adiantamentos`;

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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}