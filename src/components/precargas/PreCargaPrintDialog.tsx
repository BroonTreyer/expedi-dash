import { useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import fricoLogo from "@/assets/frico-logo-optimized.webp";
import { temRuptura } from "@/lib/ruptura-utils";
import { pesoEfetivo, pesoNaoCarregado } from "@/lib/peso-utils";
import type { Carregamento } from "@/hooks/useCarregamentos";

type Item = Carregamento & { ruptura_sinalizada?: boolean };

export interface PreCargaPrintGrupo {
  cargaId: string;
  nomeCarga: string | null;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  tipoCaminhao: string | null;
  ordemCarga: string | null;
  data: string;
  destinos: string;
  qtdPedidos: number;
  pesoTotal: number;
  pesoEmbarcado: number;
  pesoRuptura: number;
  qtdRupturas: number;
  pedidos: Array<{
    numero_pedido: number;
    cliente: string | null;
    codigo_cliente: string | null;
    cidade: string | null;
    uf: string | null;
    itens: Item[];
    pesoEmbarcado: number;
    pesoRuptura: number;
  }>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carga: PreCargaPrintGrupo | null;
}

function formatKg(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
function formatDataBr(d: string) {
  try { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; } catch { return d; }
}

export function PreCargaPrintDialog({ open, onOpenChange, carga }: Props) {
  const cleanup = useCallback(() => {
    document.body.classList.remove("printing-carga");
    const root = document.getElementById("carga-print-root");
    if (root) root.remove();
  }, []);

  useEffect(() => {
    window.addEventListener("afterprint", cleanup);
    return () => window.removeEventListener("afterprint", cleanup);
  }, [cleanup]);

  if (!carga) return null;

  const handlePrint = () => {
    const source = document.getElementById("precarga-print-content");
    if (!source) return;
    const prev = document.getElementById("carga-print-root");
    if (prev) prev.remove();
    const wrapper = document.createElement("div");
    wrapper.id = "carga-print-root";
    wrapper.appendChild(source.cloneNode(true));
    document.body.appendChild(wrapper);

    const images = wrapper.querySelectorAll("img");
    const promises = Array.from(images).map(
      (img) => new Promise<void>((resolve) => {
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

  // Rupturas detalhadas
  const rupturas: Array<{ pedido: number; cliente: string | null; item: Item }> = [];
  for (const p of carga.pedidos) {
    for (const it of p.itens) {
      if (temRuptura(it)) rupturas.push({ pedido: p.numero_pedido, cliente: p.cliente, item: it });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader className="sr-only">
          <DialogTitle>Pré-carga {carga.nomeCarga || carga.cargaId}</DialogTitle>
          <DialogDescription>Relatório de pré-carga para impressão</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir / PDF
          </Button>
        </div>

        <div id="precarga-print-content" className="space-y-4 text-foreground">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-foreground/20 pb-3">
            <img src={fricoLogo} alt="Frico" className="h-12 object-contain" width={48} height={48} />
            <div className="text-right">
              <h1 className="text-lg font-bold uppercase tracking-wide">Pré-carga</h1>
              <p className="text-sm font-semibold">{carga.nomeCarga || carga.cargaId}</p>
              <p className="text-xs text-muted-foreground">{formatDataBr(carga.data)}</p>
            </div>
          </div>

          {/* Identificação */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {carga.placa && <div><span className="font-semibold">Placa:</span> {carga.placa}</div>}
            {carga.tipoCaminhao && <div><span className="font-semibold">Tipo:</span> {carga.tipoCaminhao}</div>}
            {carga.motorista && <div><span className="font-semibold">Motorista:</span> {carga.motorista}</div>}
            {carga.transportadora && <div><span className="font-semibold">Transportadora:</span> {carga.transportadora}</div>}
            {carga.ordemCarga && <div><span className="font-semibold">Ordem:</span> {carga.ordemCarga}</div>}
            {carga.destinos && <div className="col-span-2"><span className="font-semibold">Destinos:</span> {carga.destinos}</div>}
          </div>

          {/* Rupturas detalhadas */}
          {rupturas.length > 0 ? (
            <div>
              <h2 className="text-sm font-bold mb-2">Produtos em ruptura</h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-foreground/20">
                    <th className="text-left py-1.5 pr-2 font-semibold">Pedido</th>
                    <th className="text-left py-1.5 pr-2 font-semibold">Cliente</th>
                    <th className="text-left py-1.5 pr-2 font-semibold">Código</th>
                    <th className="text-left py-1.5 pr-2 font-semibold">Produto</th>
                    <th className="text-left py-1.5 pr-2 font-semibold">Tipo de ruptura</th>
                    <th className="text-right py-1.5 pr-2 font-semibold">Peso Total (kg)</th>
                    <th className="text-right py-1.5 pr-2 font-semibold">Carregado (kg)</th>
                    <th className="text-right py-1.5 pr-2 font-semibold">Ruptura (kg)</th>
                    <th className="text-left py-1.5 font-semibold">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {rupturas.map(({ pedido, cliente, item }) => {
                    const carregado = pesoEfetivo(item);
                    const diff = pesoNaoCarregado(item);
                    const original = carregado + diff;
                    const tipo = item.ruptura ? "Total" : "Parcial";
                    return (
                      <tr key={item.id} className="border-b border-foreground/5">
                        <td className="py-1 pr-2 font-mono">#{pedido}</td>
                        <td className="py-1 pr-2">{cliente ?? "—"}</td>
                        <td className="py-1 pr-2 font-mono">{item.codigo_produto ?? "—"}</td>
                        <td className="py-1 pr-2">{item.nome_produto ?? "—"}</td>
                        <td className="py-1 pr-2 font-semibold">{tipo}</td>
                        <td className="py-1 pr-2 text-right font-mono">{formatKg(original)}</td>
                        <td className="py-1 pr-2 text-right font-mono">{formatKg(carregado)}</td>
                        <td className="py-1 pr-2 text-right font-mono">{formatKg(diff)}</td>
                        <td className="py-1">{item.motivo_ruptura ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">Sem rupturas registradas nesta pré-carga.</div>
          )}

          {/* Footer */}
          {rupturas.length > 0 && (
            <div className="border-t-2 border-foreground/20 pt-3 flex justify-between items-center text-sm font-bold">
              <span>Total em ruptura: {formatKg(carga.pesoRuptura)} kg</span>
              <span>({rupturas.length} {rupturas.length === 1 ? "item" : "itens"})</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}