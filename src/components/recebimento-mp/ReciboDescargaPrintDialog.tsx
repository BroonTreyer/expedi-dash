import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useRef } from "react";
import { format } from "date-fns";
import { useRecebimentoMpItens, type RecebimentoMp } from "@/hooks/useRecebimentosMp";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recebimento: RecebimentoMp | null;
}

function fmtBRL(n: number) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtTon(n: number) { return n.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }); }

export function ReciboDescargaPrintDialog({ open, onOpenChange, recebimento }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { data: itens = [] } = useRecebimentoMpItens(recebimento?.id);

  if (!recebimento) return null;

  function handlePrint() {
    if (!ref.current) return;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Recibo de Descarga ${recebimento.recibo_numero ?? ""}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: -apple-system, system-ui, sans-serif; color: #111; }
        h1 { font-size: 18px; margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
        th, td { border: 1px solid #999; padding: 4px 6px; }
        th { background: #f0f0f0; text-align: left; }
        .right { text-align: right; }
        .header { border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .meta { font-size: 12px; color: #444; }
        .totals { margin-top: 8px; text-align: right; font-size: 13px; }
        .totals .grand { font-size: 16px; font-weight: bold; margin-top: 4px; }
        .sign { margin-top: 28px; border-top: 1px solid #333; padding-top: 4px; font-size: 11px; text-align: center; }
        .pay { margin-top: 14px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 11px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Recibo de Descarga</DialogTitle></DialogHeader>
        <div ref={ref} className="bg-background text-foreground p-4 text-sm">
          <div className="header">
            <h1>Recibo de Descarga</h1>
            <div className="meta">
              <div><b>{recebimento.recibo_numero}</b></div>
              <div>{format(new Date(recebimento.data_chegada), "dd/MM/yyyy")} {recebimento.hora_chegada ?? ""}</div>
            </div>
          </div>

          <div className="meta">
            <div><b>Fornecedor:</b> {recebimento.fornecedor_nome ?? "—"}</div>
            <div><b>Motorista:</b> {recebimento.motorista ?? "—"} · <b>Placa:</b> {recebimento.placa ?? "—"}</div>
            <div><b>Conferente:</b> {recebimento.conferente ?? "—"} · <b>Doca:</b> {recebimento.doca_setor ?? "—"}</div>
            <div><b>Pallets:</b> {recebimento.pallets_quantidade ?? 0} · <b>Devolveu:</b> {recebimento.pallets_devolvidos ? "Sim" : "Não"}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Nota Fiscal</th>
                <th className="right">Ton</th>
                <th className="right">R$/ton</th>
                <th className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.id}>
                  <td>{i.nome_produto}</td>
                  <td>{i.nota_fiscal ?? "—"}</td>
                  <td className="right">{fmtTon(i.peso_ton)}</td>
                  <td className="right">{fmtBRL(i.valor_unitario)}</td>
                  <td className="right">{fmtBRL(i.valor_total_linha)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="totals">
            <div>Subtotal: <b>{fmtTon(recebimento.peso_total_ton)} ton</b></div>
            <div className="grand">Valor total: {fmtBRL(recebimento.valor_total)}</div>
          </div>

          <div className="pay">
            <b>Dados para pagamento</b> — Banco SICOOB · PIX (62) 99969-2686 · CNPJ 07.014.305.0001-00<br />
            Enviar comprovante: compras@frico.ind.br ou WhatsApp (62) 99607-5751
          </div>

          <div className="sign">A Recebedor ==&gt; ____________________________________________</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
