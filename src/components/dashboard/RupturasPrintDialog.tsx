import { useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import fricoLogo from "@/assets/frico-logo.webp";

interface ProductSummaryItem {
  codigo: string;
  nome: string;
  count: number;
  peso: number;
}

interface RupturaItem {
  id: string;
  numero_pedido: number | null;
  nome_produto: string | null;
  codigo_produto: string | null;
  cliente: string | null;
  codigo_cliente: string | null;
  peso: number | null;
}

export interface RupturasPrintData {
  data: string;
  totalRupturas: number;
  totalPeso: number;
  productSummary: ProductSummaryItem[];
  items: RupturaItem[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: RupturasPrintData | null;
}

export function RupturasPrintDialog({ open, onOpenChange, data }: Props) {
  const cleanup = useCallback(() => {
    document.body.classList.remove("printing-carga");
    const root = document.getElementById("carga-print-root");
    if (root) root.remove();
  }, []);

  useEffect(() => {
    window.addEventListener("afterprint", cleanup);
    return () => window.removeEventListener("afterprint", cleanup);
  }, [cleanup]);

  if (!data) return null;

  const handlePrint = () => {
    const source = document.getElementById("rupturas-print-content");
    if (!source) return;
    const prev = document.getElementById("carga-print-root");
    if (prev) prev.remove();
    const wrapper = document.createElement("div");
    wrapper.id = "carga-print-root";
    wrapper.appendChild(source.cloneNode(true));
    document.body.appendChild(wrapper);

    const images = wrapper.querySelectorAll("img");
    const promises = Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    );
    Promise.all(promises).then(() => {
      document.body.classList.add("printing-carga");
      window.print();
      setTimeout(cleanup, 2000);
    });
  };

  const dataFormatada = (() => {
    const [y, m, d] = data.data.split("-");
    return `${d}/${m}/${y}`;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader className="sr-only">
          <DialogTitle>Relatório de Rupturas</DialogTitle>
          <DialogDescription>Relatório de rupturas para impressão</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir / PDF
          </Button>
        </div>

        <div id="rupturas-print-content" className="space-y-4 text-foreground">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-foreground/20 pb-3">
            <img src={fricoLogo} alt="Frico" className="h-12 object-contain" width={48} height={48} />
            <div className="text-right">
              <h1 className="text-lg font-bold uppercase tracking-wide">Relatório de Rupturas</h1>
              <p className="text-sm text-muted-foreground">{dataFormatada}</p>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold">Total Rupturas:</span> {data.totalRupturas}</div>
            <div><span className="font-semibold">Peso Total:</span> {(data.totalPeso / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} TON</div>
          </div>

          <div className="border-t border-foreground/10" />

          {/* Product Summary */}
          {data.productSummary.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-2">Resumo por Produto</h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-foreground/20">
                    <th className="text-left py-1.5 pr-2 font-semibold">Código</th>
                    <th className="text-left py-1.5 pr-2 font-semibold">Produto</th>
                    <th className="text-right py-1.5 pr-2 font-semibold">Qtd</th>
                    <th className="text-right py-1.5 font-semibold">Peso (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.productSummary.map((p) => (
                    <tr key={p.codigo} className="border-b border-foreground/5">
                      <td className="py-1 pr-2 font-mono">{p.codigo}</td>
                      <td className="py-1 pr-2">{p.nome}</td>
                      <td className="py-1 pr-2 text-right">{p.count}</td>
                      <td className="py-1 text-right font-mono">{p.peso.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-foreground/10" />

          {/* Detailed list */}
          <div>
            <h2 className="text-sm font-bold mb-2">Detalhamento</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-foreground/20">
                  <th className="text-left py-1.5 pr-2 font-semibold">Pedido</th>
                  <th className="text-left py-1.5 pr-2 font-semibold">Código</th>
                  <th className="text-left py-1.5 pr-2 font-semibold">Produto</th>
                  <th className="text-left py-1.5 pr-2 font-semibold">Cliente</th>
                  <th className="text-right py-1.5 font-semibold">Peso (kg)</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-foreground/5">
                    <td className="py-1 pr-2 font-mono">{item.numero_pedido ?? "—"}</td>
                    <td className="py-1 pr-2 font-mono">{item.codigo_produto ?? "—"}</td>
                    <td className="py-1 pr-2">{item.nome_produto ?? "—"}</td>
                    <td className="py-1 pr-2">{item.cliente ?? item.codigo_cliente ?? "—"}</td>
                    <td className="py-1 text-right font-mono">{(item.peso ?? 0).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer totals */}
          <div className="border-t-2 border-foreground/20 pt-3 flex justify-between items-center text-sm font-bold">
            <span>{data.totalRupturas} {data.totalRupturas === 1 ? "ruptura" : "rupturas"}</span>
            <span>{data.totalPeso.toLocaleString("pt-BR")} kg</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
