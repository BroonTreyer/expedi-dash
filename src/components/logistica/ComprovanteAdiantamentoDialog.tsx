import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Printer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAdiantamentoCtes, useMarcarAdiantamentoPago, type Adiantamento } from "@/hooks/useAdiantamentos";
import { useTransportadorasFinanceiro } from "@/hooks/useTransportadorasFinanceiro";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtKg = (n: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n || 0);

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  adiantamento: Adiantamento | null;
}

export function ComprovanteAdiantamentoDialog({ open, onOpenChange, adiantamento }: Props) {
  const { data: ctes = [] } = useAdiantamentoCtes(adiantamento?.id ?? null);
  const { data: transp = [] } = useTransportadorasFinanceiro();
  const marcarPago = useMarcarAdiantamentoPago();

  const transpInfo = useMemo(
    () => transp.find((t) => t.id === adiantamento?.transportadora_id) ?? null,
    [transp, adiantamento],
  );

  const numeros = useMemo(
    () =>
      ctes
        .map((r) => r.cte?.numero_cte)
        .filter(Boolean)
        .join("/"),
    [ctes],
  );

  const texto = useMemo(() => {
    if (!adiantamento) return "";
    const linhas = [
      "ADIANTAMENTO DE FRETE CIF, FORA DO ESTADO.",
      "",
      `1.${adiantamento.transportadora} (${fmtKg(adiantamento.peso_total)} Kg) CTE`,
      numeros,
      `*VLR ${fmtBRL(adiantamento.valor_total_ctes)}*`,
      "",
      `*Valor Total do Frete ${fmtBRL(adiantamento.valor_total_ctes)}*`,
      "",
      `${adiantamento.percentual}% de Adiantamento`,
      "",
      `*${fmtBRL(adiantamento.valor_adiantamento)}*`,
      "",
      transpInfo?.codigo ? `Código ${transpInfo.codigo} – ${transpInfo.nome}` : adiantamento.transportadora,
      transpInfo?.pix_chave ? `Pix: ${transpInfo.pix_chave}` : "",
    ].filter((l) => l !== undefined);
    return linhas.join("\n");
  }, [adiantamento, numeros, transpInfo]);

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(texto);
    setCopied(true);
    toast.success("Texto copiado — cole no WhatsApp");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!adiantamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Comprovante — {adiantamento.numero}</DialogTitle>
        </DialogHeader>

        <div className="border rounded-md p-4 bg-muted/30 font-mono text-sm whitespace-pre-wrap leading-relaxed">
          {texto}
        </div>

        {!transpInfo?.pix_chave && (
          <p className="text-xs text-muted-foreground">
            Cadastre código e chave PIX em <strong>Cadastros → Transportadoras</strong> para que apareçam aqui.
          </p>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={copy}>
            {copied ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />} Copiar texto
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
          {adiantamento.status === "pendente" && (
            <Button
              onClick={async () => {
                await marcarPago.mutateAsync(adiantamento.id);
                onOpenChange(false);
              }}
              disabled={marcarPago.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar como pago
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}