import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateRecebimentoMp, uploadRecebimentoMpFile, type RecebimentoMp } from "@/hooks/useRecebimentosMp";
import { CheckCircle2, Truck } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recebimento: RecebimentoMp | null;
}

function fmtBRL(n: number) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export function PagamentoDialog({ open, onOpenChange, recebimento }: Props) {
  const update = useUpdateRecebimentoMp();
  const [forma, setForma] = useState<string>(recebimento?.forma_pagamento ?? "pix");
  const [comprovante, setComprovante] = useState<File | null>(null);

  if (!recebimento) return null;

  async function marcarPago() {
    if (!comprovante && !recebimento.comprovante_url) {
      toast.error("Anexe o comprovante de pagamento");
      return;
    }
    let url = recebimento.comprovante_url;
    if (comprovante) {
      url = await uploadRecebimentoMpFile(comprovante, recebimento.id, "comprovante");
    }
    const { data: u } = await supabase.auth.getUser();
    await update.mutateAsync({
      id: recebimento.id,
      forma_pagamento: forma,
      pagamento_status: "pago",
      pago_em: new Date().toISOString(),
      pago_por: u.user?.id ?? null,
      comprovante_url: url,
      status_geral: "pago",
    } as any);
    toast.success("Pagamento confirmado");
  }

  async function liberarCaminhao() {
    if (recebimento.pagamento_status !== "pago") {
      toast.error("Marque como pago antes de liberar");
      return;
    }
    await update.mutateAsync({ id: recebimento.id, status_geral: "liberado" });
    toast.success("Caminhão liberado");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento da Descarga</DialogTitle>
          <DialogDescription>Recibo {recebimento.recibo_numero} · {recebimento.fornecedor_nome ?? "—"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border p-3 bg-muted/40 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Total a pagar</div>
              <div className="text-2xl font-bold tabular-nums">{fmtBRL(recebimento.valor_total)}</div>
            </div>
            <div className="text-xs text-right text-muted-foreground">
              {recebimento.peso_total_ton.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} ton<br />
              × {fmtBRL(recebimento.valor_tonelada)}/ton
            </div>
          </div>

          <div>
            <Label>Forma de pagamento</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Comprovante {recebimento.comprovante_url ? "(já anexado)" : "*"}</Label>
            <Input type="file" accept="image/*,application/pdf" onChange={(e) => setComprovante(e.target.files?.[0] ?? null)} />
            {recebimento.comprovante_url && (
              <a href={recebimento.comprovante_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mt-1 inline-block">Ver comprovante atual</a>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          {recebimento.pagamento_status !== "pago" ? (
            <Button onClick={marcarPago} disabled={update.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como Pago
            </Button>
          ) : (
            <Button onClick={liberarCaminhao} disabled={update.isPending || recebimento.status_geral === "liberado"}>
              <Truck className="h-4 w-4 mr-2" /> Liberar Caminhão
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
