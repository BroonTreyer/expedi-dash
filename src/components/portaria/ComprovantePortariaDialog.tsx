import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import QRCode from "qrcode";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import { CATEGORIAS } from "@/hooks/useMovimentacoesPortaria";
import { computeTempos, formatDuracao } from "@/lib/portaria-tempos";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  movimento: MovimentacaoPortaria | null;
  movimentoSaida?: MovimentacaoPortaria | null;
  portalToken?: string | null;
}

function fmt(d?: string | null): string {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }); } catch { return "—"; }
}

function getCategoriaLabel(val: string) {
  return CATEGORIAS.find((c) => c.value === val)?.label || val;
}

export function ComprovantePortariaDialog({ open, onOpenChange, movimento, movimentoSaida, portalToken }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const portalUrl = portalToken ? `${window.location.origin}/portal/${portalToken}` : null;

  useEffect(() => {
    if (!open) return;
    if (!portalUrl) { setQrDataUrl(null); return; }
    QRCode.toDataURL(portalUrl, { width: 160, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null));
  }, [open, portalUrl]);

  if (!movimento) return null;
  const m = movimento;
  const s = movimentoSaida;
  const isCargaPropria = m.categoria === "carga_propria";
  const tempos = computeTempos(m, s);

  const chegada = m.horario_chegada || (m.tipo_movimento === "entrada" ? m.data_hora : null);
  const entrada = m.horario_entrada || (m.tipo_movimento === "entrada" ? m.data_hora : null);
  const saida = isCargaPropria
    ? ((m as any).horario_saida_final || m.horario_real_saida || null)
    : (s?.data_hora || (m.tipo_movimento === "saida" ? m.data_hora : null));

  const handlePrint = () => {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Comprovante de Portaria</title>
      <style>
        @page { size: A5; margin: 10mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; margin: 0; padding: 0; }
        .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 10px; }
        .header h1 { margin: 0; font-size: 16px; letter-spacing: 1px; }
        .header p { margin: 2px 0 0; font-size: 11px; color: #555; }
        .row { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; font-size: 12px; }
        .row .lbl { color: #666; }
        .row .val { font-weight: 600; text-align: right; }
        .section { margin-top: 10px; padding-top: 6px; border-top: 1px dashed #999; }
        .section h2 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #444; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 12px; }
        .grid div span { color: #666; }
        .grid div b { color: #111; }
        .footer { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .footer .qr { text-align: center; }
        .footer .qr img { width: 90px; height: 90px; }
        .footer .qr p { margin: 4px 0 0; font-size: 10px; color: #666; }
        .footer .sign { flex: 1; }
        .footer .sign .line { border-top: 1px solid #333; margin-top: 30px; padding-top: 4px; text-align: center; font-size: 10px; color: #555; }
        .photo { margin-top: 10px; text-align: center; }
        .photo img { max-width: 100%; max-height: 120px; border: 1px solid #ccc; }
        .photo p { margin: 4px 0 0; font-size: 10px; color: #666; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comprovante de Portaria</DialogTitle>
          <DialogDescription>Pré-visualização do comprovante (A5)</DialogDescription>
        </DialogHeader>

        <div ref={printRef} className="bg-background text-foreground rounded-md border p-3 text-[12px] leading-snug">
          <div className="header">
            <h1>COMPROVANTE DE PORTARIA</h1>
            <p>Emitido em {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
          </div>

          <div className="row"><span className="lbl">Categoria</span><span className="val">{getCategoriaLabel(m.categoria)}</span></div>
          <div className="row"><span className="lbl">Placa</span><span className="val">{m.placa || "—"}</span></div>
          <div className="row"><span className="lbl">Motorista</span><span className="val">{m.motorista || m.nome_completo || "—"}</span></div>
          {m.empresa && <div className="row"><span className="lbl">Empresa</span><span className="val">{m.empresa}</span></div>}
          {m.carga_id && <div className="row"><span className="lbl">Carga</span><span className="val">{m.carga_id}</span></div>}
          {m.rota && <div className="row"><span className="lbl">Rota</span><span className="val">{m.rota}</span></div>}

          <div className="section">
            <h2>Horários</h2>
            <div className="grid">
              <div><span>Chegada:</span> <b>{fmt(chegada)}</b></div>
              <div><span>Entrada:</span> <b>{fmt(entrada)}</b></div>
              {isCargaPropria && <div><span>Saída p/ Rota:</span> <b>{fmt(m.horario_real_saida)}</b></div>}
              {isCargaPropria && <div><span>Retorno:</span> <b>{fmt(m.horario_real_retorno)}</b></div>}
              <div><span>Saída:</span> <b>{fmt(saida)}</b></div>
            </div>
          </div>

          <div className="section">
            <h2>Tempos Operacionais</h2>
            <div className="grid">
              <div><span>Espera:</span> <b>{formatDuracao(tempos.espera)}</b></div>
              <div><span>Operação:</span> <b>{formatDuracao(tempos.operacao)}</b></div>
              <div><span>Total no pátio:</span> <b>{formatDuracao(tempos.total)}</b></div>
            </div>
          </div>

          {m.foto_placa_url && (
            <div className="photo">
              <img src={m.foto_placa_url} alt="Foto da Placa" />
              <p>Foto da Placa</p>
            </div>
          )}

          <div className="footer">
            <div className="sign">
              <div className="line">Assinatura do Motorista</div>
            </div>
            {qrDataUrl && portalUrl && (
              <div className="qr">
                <img src={qrDataUrl} alt="QR portal" />
                <p>Acompanhe online</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}