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
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 11px; }
        h1 { font-size: 15px; margin: 0; text-align: center; letter-spacing: 1px; }
        .via { border: 1px solid #000; padding: 8px 10px; margin-bottom: 6px; }
        .row { display: flex; justify-content: space-between; align-items: center; }
        .meta-row { display: flex; gap: 16px; margin: 4px 0 6px; font-size: 11px; }
        .meta-row b { font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px; }
        th, td { border: 1px solid #555; padding: 3px 5px; }
        th { background: #eee; text-align: left; font-weight: 700; }
        .right { text-align: right; }
        .center { text-align: center; }
        .grand { font-size: 13px; font-weight: 700; margin-top: 4px; text-align: right; }
        .sign { margin-top: 18px; font-size: 11px; }
        .sign .line { display: inline-block; border-bottom: 1px solid #000; width: 380px; margin-left: 6px; vertical-align: bottom; }
        .cut { border: 0; border-top: 1px dashed #555; margin: 8px 0; text-align: center; font-size: 9px; color: #777; }
        .pay { margin-top: 6px; padding: 6px 8px; border: 1px solid #000; font-size: 10.5px; }
        .page-break { page-break-before: always; }
        .ctrl h2 { font-size: 13px; margin: 0 0 6px; text-align: center; letter-spacing: 1px; }
        .ctrl .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; font-size: 11px; }
        .ctrl .grid div { padding: 2px 0; border-bottom: 1px dotted #999; }
        .ctrl .prods { margin-top: 8px; }
        .ctrl .prods .item { padding: 4px 0; border-bottom: 1px dotted #999; font-size: 11px; }
        .ctrl .check { margin-top: 8px; font-size: 11px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  const dataFmt = format(new Date(recebimento.data_chegada + "T00:00:00"), "dd/MM/yyyy");
  const hora = recebimento.hora_chegada?.slice(0, 5) ?? "";

  const Via = () => (
    <div className="via">
      <h1>RECIBO DE DESCARGA</h1>
      <div className="meta-row">
        <div style={{ flex: 1 }}><b>FORNECEDOR:</b> {recebimento.fornecedor_nome ?? "—"}</div>
        <div><b>Data:</b> {dataFmt}</div>
        <div><b>Hora:</b> {hora}</div>
        <div><b>Recibo:</b> {recebimento.recibo_numero ?? "—"}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th className="right" style={{ width: 70 }}>Quant.</th>
            <th className="center" style={{ width: 40 }}>Ton</th>
            <th>Descrição / Nota Fiscal</th>
            <th className="right" style={{ width: 70 }}>R$/ton</th>
            <th className="right" style={{ width: 90 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {(itens.length ? itens : Array(3).fill(null)).map((i, idx) => (
            <tr key={idx}>
              <td className="right">{i ? fmtTon(i.peso_ton) : ""}</td>
              <td className="center">{i ? "ton" : ""}</td>
              <td>{i ? `${i.nome_produto}${i.nota_fiscal ? ` — NF ${i.nota_fiscal}` : ""}` : ""}</td>
              <td className="right">{i ? fmtBRL(i.valor_unitario) : ""}</td>
              <td className="right">{i ? fmtBRL(i.valor_total_linha) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grand">TOTAL: {fmtBRL(Number(recebimento.valor_total))}</div>
      <div className="sign">A Recebedor ==&gt;<span className="line"></span></div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Recibo de Descarga</DialogTitle></DialogHeader>
        <div ref={ref} className="bg-background text-foreground p-2 text-xs">
          {/* Via 1 */}
          <Via />
          <div className="cut">— — — — — — — — — — — — — — corte — — — — — — — — — — — — — —</div>
          {/* Via 2 */}
          <Via />

          {/* Anexo de pagamento (motorista) */}
          <div className="pay">
            <div style={{ fontWeight: 700, marginBottom: 4 }}>DADOS PARA PAGAMENTO DA DESCARGA — ANEXO</div>
            <div><b>MOTORISTA:</b> {recebimento.motorista ?? "—"}</div>
            <div><b>TELEFONE:</b> {recebimento.telefone ?? "—"}</div>
            <div><b>CPF:</b> {recebimento.cpf ?? "—"}</div>
            <div><b>PLACA:</b> {recebimento.placa ?? "—"}</div>
            <div style={{ marginTop: 4 }}>ENTREGAR NA DOCA — Fricó Indústria e Comércio de Alimentos</div>
            <div style={{ marginTop: 4, fontSize: 10 }}>
              Banco SICOOB · PIX (62) 99969-2686 · CNPJ 07.014.305/0001-00 · compras@frico.ind.br · WhatsApp (62) 99607-5751
            </div>
          </div>

          {/* Folha de controle interno (página 2) */}
          <div className="page-break ctrl" style={{ marginTop: 10 }}>
            <h2>RECEBIMENTO MATÉRIA PRIMA — CONTROLE INTERNO</h2>
            <div className="grid">
              <div><b>Data de chegada:</b> {dataFmt}</div>
              <div><b>Hora de chegada:</b> {hora || "—"}</div>
              <div><b>Data Recebimento:</b> {recebimento.data_recebimento ? format(new Date(recebimento.data_recebimento + "T00:00:00"), "dd/MM/yyyy") : "—"}</div>
              <div><b>Data Descarga:</b> {recebimento.data_descarga ? format(new Date(recebimento.data_descarga + "T00:00:00"), "dd/MM/yyyy") : "—"}</div>
              <div><b>Fornecedor:</b> {recebimento.fornecedor_nome ?? "—"}</div>
              <div><b>Conferente:</b> {recebimento.conferente ?? "—"}</div>
              <div><b>Doca/Setor:</b> {recebimento.doca_setor ?? "—"}</div>
              <div><b>Pallets:</b> {recebimento.pallets_quantidade ?? 0}</div>
            </div>
            <div className="prods">
              <div style={{ fontWeight: 700, marginTop: 6 }}>PRODUTOS / NOTAS FISCAIS</div>
              {(itens.length ? itens : [null, null, null, null, null, null]).map((it, idx) => (
                <div className="item" key={idx}>
                  <b>Produto {idx + 1}:</b> {it ? it.nome_produto : ""} {it?.nota_fiscal ? ` · N° Nota: ${it.nota_fiscal}` : ""} {it ? ` · ${fmtTon(it.peso_ton)} ton` : ""}
                </div>
              ))}
            </div>
            <div className="check">
              <b>Devolveu Pallets:</b> {recebimento.pallets_devolvidos ? "( X ) Sim   ( ) Não" : "( ) Sim   ( X ) Não"}
            </div>
            <div className="sign" style={{ marginTop: 18 }}>Assinatura Conferente:<span className="line"></span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
