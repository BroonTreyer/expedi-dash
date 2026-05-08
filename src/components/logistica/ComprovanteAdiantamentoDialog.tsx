import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Printer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useMarcarAdiantamentoPago, type Adiantamento, type AdiantamentoCte } from "@/hooks/useAdiantamentos";
import { useTransportadorasFinanceiro } from "@/hooks/useTransportadorasFinanceiro";
import type { CteDacteRow } from "@/hooks/useCtesDacte";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtKg = (n: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n || 0);

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

  const totalCtes = adiantamentos.reduce((s, a) => s + (a.valor_total_ctes || 0), 0);
  const totalAdt = adiantamentos.reduce((s, a) => s + (a.valor_adiantamento || 0), 0);
  const percentuaisDistintos = Array.from(new Set(adiantamentos.map((a) => a.percentual)));
  const percUnico = percentuaisDistintos.length === 1 ? percentuaisDistintos[0] : null;

  const texto = useMemo(() => {
    if (adiantamentos.length === 0) return "";
    const linhas: string[] = ["ADIANTAMENTO DE FRETE CIF, FORA DO ESTADO.", ""];
    adiantamentos.forEach((a, idx) => {
      const ctes = (ctesQueries[idx]?.data ?? []) as AdiantamentoCte[];
      const numeros = ctes.map((r) => r.cte?.numero_cte).filter(Boolean).join("/");
      linhas.push(`${idx + 1}.${a.transportadora} (${fmtKg(a.peso_total)} Kg) CTE`);
      if (numeros) linhas.push(numeros);
      linhas.push(`*VLR ${fmtBRL(a.valor_total_ctes)}*`);
      if (percUnico === null) {
        linhas.push(`${a.percentual}% Adt = *${fmtBRL(a.valor_adiantamento)}*`);
      }
      linhas.push("");
    });
    linhas.push(`*Valor Total do Frete ${fmtBRL(totalCtes)}*`, "");
    if (percUnico !== null) {
      linhas.push(`${percUnico}% de Adiantamento`, "", `*${fmtBRL(totalAdt)}*`, "");
    } else {
      linhas.push(`*Total Adiantamento ${fmtBRL(totalAdt)}*`, "");
    }
    adiantamentos.forEach((a) => {
      const info = transp.find((t) => t.id === a.transportadora_id) ?? null;
      linhas.push(info?.codigo ? `Código ${info.codigo} – ${info.nome}` : a.transportadora);
      if (info?.pix_chave) linhas.push(`Pix: ${info.pix_chave}`);
    });
    return linhas.join("\n");
  }, [adiantamentos, ctesQueries, transp, totalCtes, totalAdt, percUnico]);

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(texto);
    setCopied(true);
    toast.success("Texto copiado — cole no WhatsApp");
    setTimeout(() => setCopied(false), 2000);
  };

  if (adiantamentos.length === 0) return null;

  const pendentes = adiantamentos.filter((a) => a.status === "pendente");
  const semPix = adiantamentos.some((a) => {
    const info = transp.find((t) => t.id === a.transportadora_id);
    return !info?.pix_chave;
  });

  const titulo =
    adiantamentos.length === 1
      ? `Comprovante — ${adiantamentos[0].numero}`
      : `Comprovante — ${adiantamentos.length} adiantamentos`;

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
                for (const a of pendentes) {
                  await marcarPago.mutateAsync(a.id);
                }
                onOpenChange(false);
              }}
              disabled={marcarPago.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {pendentes.length === 1 ? "Marcar como pago" : `Marcar ${pendentes.length} como pagos`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}