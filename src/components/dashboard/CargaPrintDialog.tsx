import { useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import fricoLogo from "@/assets/frico-logo.png";

interface ClienteGroup {
  codigoCliente: string | null;
  nomeCliente: string | null;
  items: { id: string; nomeProduto: string | null; peso: number }[];
  pesoTotal: number;
  ordem: number;
}

export interface CargaPrintData {
  cargaId: string;
  data: string;
  tipoCaminhao: string;
  placa: string;
  motorista: string;
  transportadora?: string;
  horarioPrevisto?: string;
  groups: ClienteGroup[];
  totalPeso: number;
  totalPedidos: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CargaPrintData | null;
}

export function CargaPrintDialog({ open, onOpenChange, data }: Props) {
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
    const source = document.getElementById("carga-print-content");
    if (!source) return;

    const prev = document.getElementById("carga-print-root");
    if (prev) prev.remove();

    const wrapper = document.createElement("div");
    wrapper.id = "carga-print-root";
    wrapper.appendChild(source.cloneNode(true));
    document.body.appendChild(wrapper);

    // Wait for all images to load in the clone before printing
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

  const sortedGroups = [...data.groups].sort((a, b) => a.ordem - b.ordem);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader className="sr-only">
          <DialogTitle>Romaneio de Carga</DialogTitle>
          <DialogDescription>Visualização do romaneio para impressão</DialogDescription>
        </DialogHeader>

        {/* Screen-only buttons */}
        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir / PDF
          </Button>
        </div>

        {/* Printable content */}
        <div id="carga-print-content" className="space-y-4 text-foreground">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-foreground/20 pb-3">
            <img src={fricoLogo} alt="Frico" className="h-12 object-contain" width={48} height={48} />
            <div className="text-right">
              <h1 className="text-lg font-bold uppercase tracking-wide">Romaneio de Carga</h1>
              <p className="text-sm text-muted-foreground">{data.cargaId}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div><span className="font-semibold">Data:</span> {dataFormatada}</div>
            <div><span className="font-semibold">Caminhão:</span> {data.tipoCaminhao}</div>
            <div><span className="font-semibold">Placa:</span> {data.placa}</div>
            <div><span className="font-semibold">Motorista:</span> {data.motorista}</div>
            {data.transportadora && (
              <div><span className="font-semibold">Transportadora:</span> {data.transportadora}</div>
            )}
            {data.horarioPrevisto && (
              <div><span className="font-semibold">Horário Previsto:</span> {data.horarioPrevisto}</div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-foreground/10" />

          {/* Groups by delivery order */}
          <div className="space-y-3">
            {sortedGroups.map((group) => (
              <div key={group.codigoCliente ?? group.ordem} className="border border-foreground/10 rounded-md p-3 break-inside-avoid">
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="text-sm font-bold">
                    {group.ordem}. {group.codigoCliente ? `${group.codigoCliente} – ${group.nomeCliente ?? ""}` : "Sem cliente"}
                  </h3>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {group.pesoTotal.toLocaleString("pt-BR")} kg
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer totals */}
          <div className="border-t-2 border-foreground/20 pt-3 flex justify-between items-center text-sm font-bold">
            <span>{data.totalPedidos} {data.totalPedidos === 1 ? "pedido" : "pedidos"} · {sortedGroups.length} {sortedGroups.length === 1 ? "cliente" : "clientes"}</span>
            <span>{data.totalPeso.toLocaleString("pt-BR")} kg</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
