import { useEffect, useCallback, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck, PackageCheck, X } from "lucide-react";
import fricoLogo from "@/assets/frico-logo-optimized.webp";

interface ClienteGroup {
  codigoCliente: string | null;
  nomeCliente: string | null;
  items: { id: string; nomeProduto: string | null; peso: number; ruptura?: boolean }[];
  pesoTotal: number;
  rupturaCount?: number;
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
  totalRuptura?: number;
  totalPedidos: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CargaPrintData | null;
}

export function CargaPrintDialog({ open, onOpenChange, data }: Props) {
  const [modo, setModo] = useState<"entrega" | "carregamento">("entrega");
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

  const doPrint = () => {
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

  const handlePrintMode = (next: "entrega" | "carregamento") => {
    setModo(next);
    // Wait re-render before cloning the DOM
    setTimeout(doPrint, 60);
  };

  const dataFormatada = (() => {
    const [y, m, d] = data.data.split("-");
    return `${d}/${m}/${y}`;
  })();

  const sortedGroups = [...data.groups].sort((a, b) => a.ordem - b.ordem);
  const total = sortedGroups.length;
  const displayGroups = modo === "entrega"
    ? sortedGroups
    : [...sortedGroups].sort((a, b) => b.ordem - a.ordem);
  const tituloRomaneio = modo === "entrega"
    ? "Romaneio — Sequência de Entrega"
    : "Romaneio — Sequência de Carregamento";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader className="sr-only">
          <DialogTitle>Romaneio de Carga</DialogTitle>
          <DialogDescription>Visualização do romaneio para impressão</DialogDescription>
        </DialogHeader>

        {/* Screen-only buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 print:hidden">
          <div className="inline-flex rounded-md border p-0.5 bg-muted/40">
            <Button
              variant={modo === "entrega" ? "default" : "ghost"}
              size="sm"
              onClick={() => setModo("entrega")}
              className="h-7 px-2 text-xs"
            >
              <Truck className="h-3.5 w-3.5 mr-1" /> Entrega
            </Button>
            <Button
              variant={modo === "carregamento" ? "default" : "ghost"}
              size="sm"
              onClick={() => setModo("carregamento")}
              className="h-7 px-2 text-xs"
            >
              <PackageCheck className="h-3.5 w-3.5 mr-1" /> Carregamento
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1" /> Fechar
            </Button>
            <Button size="sm" variant="outline" onClick={() => handlePrintMode("entrega")}>
              <Truck className="h-4 w-4 mr-1" /> Imprimir Entrega
            </Button>
            <Button size="sm" onClick={() => handlePrintMode("carregamento")}>
              <PackageCheck className="h-4 w-4 mr-1" /> Imprimir Carregamento
            </Button>
          </div>
        </div>

        {/* Printable content */}
        <div id="carga-print-content" className="space-y-4 text-foreground">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-foreground/20 pb-3">
            <img src={fricoLogo} alt="Frico" className="h-12 object-contain" width={48} height={48} />
            <div className="text-right">
              <h1 className="text-lg font-bold uppercase tracking-wide">{tituloRomaneio}</h1>
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

          {/* Legenda ordens */}
          <p className="text-[11px] text-muted-foreground -mt-2">
            <span className="font-semibold">E</span> = ordem de entrega · <span className="font-semibold">C</span> = ordem de carregamento (sequência inversa para empilhar no caminhão)
          </p>

          {/* Groups by delivery order */}
          <div className="space-y-3">
            {sortedGroups.map((group) => (
              <div key={group.codigoCliente ?? group.ordem} className="border border-foreground/10 rounded-md p-3 break-inside-avoid">
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="text-sm font-bold flex items-baseline gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                      <span className="px-1.5 py-0.5 rounded bg-foreground/10">E:{group.ordem}</span>
                      <span className="px-1.5 py-0.5 rounded bg-foreground/10">C:{sortedGroups.length - group.ordem + 1}</span>
                    </span>
                    <span>{group.codigoCliente ? `${group.codigoCliente} – ${group.nomeCliente ?? ""}` : "Sem cliente"}</span>
                  </h3>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {group.pesoTotal.toLocaleString("pt-BR")} kg
                  </span>
                </div>
                {group.items.some((i) => i.ruptura) && (
                  <ul className="mt-1 space-y-0.5 text-[11px]">
                    {group.items.filter((i) => i.ruptura).map((i) => (
                      <li key={i.id} className="flex justify-between text-muted-foreground line-through decoration-destructive/70 decoration-2">
                        <span>RUPTURA — {i.nomeProduto ?? "item"} (não carregado)</span>
                        <span>{i.peso.toLocaleString("pt-BR")} kg</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Footer totals */}
          <div className="border-t-2 border-foreground/20 pt-3 flex justify-between items-center text-sm font-bold">
            <span>{data.totalPedidos} {data.totalPedidos === 1 ? "pedido" : "pedidos"} · {sortedGroups.length} {sortedGroups.length === 1 ? "cliente" : "clientes"}</span>
            <span>{data.totalPeso.toLocaleString("pt-BR")} kg</span>
          </div>
          {data.totalRuptura != null && data.totalRuptura > 0 && (
            <div className="text-[11px] text-muted-foreground -mt-2">
              ↳ {data.totalRuptura.toLocaleString("pt-BR")} kg em ruptura não embarcado (peso planejado: {(data.totalPeso + data.totalRuptura).toLocaleString("pt-BR")} kg)
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
