import { useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import fricoLogo from "@/assets/frico-logo.png";

interface CargaSummary {
  cargaId: string;
  tipoCaminhao: string | null;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  status: string;
  pesoTotal: number;
  qtdPedidos: number;
  qtdClientes: number;
  ufs: string;
}

export interface ConsolidadoPrintData {
  data: string;
  groups: CargaSummary[];
  totalVeiculos: number;
  totalPeso: number;
  totalPedidos: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ConsolidadoPrintData | null;
}

export function ConsolidadoPrintDialog({ open, onOpenChange, data }: Props) {
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
    const source = document.getElementById("consolidado-print-content");
    if (!source) return;
    const prev = document.getElementById("carga-print-root");
    if (prev) prev.remove();
    const wrapper = document.createElement("div");
    wrapper.id = "carga-print-root";
    wrapper.appendChild(source.cloneNode(true));
    document.body.appendChild(wrapper);
    document.body.classList.add("printing-carga");
    window.print();
    setTimeout(cleanup, 2000);
  };

  const dataFormatada = (() => {
    const [y, m, d] = data.data.split("-");
    return `${d}/${m}/${y}`;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader className="sr-only">
          <DialogTitle>Consolidado de Cargas</DialogTitle>
          <DialogDescription>Relatório consolidado para impressão</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir / PDF
          </Button>
        </div>

        <div id="consolidado-print-content" className="space-y-4 text-foreground">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-foreground/20 pb-3">
            <img src={fricoLogo} alt="Frico" className="h-12 object-contain" />
            <div className="text-right">
              <h1 className="text-lg font-bold uppercase tracking-wide">Consolidado de Cargas</h1>
              <p className="text-sm text-muted-foreground">{dataFormatada}</p>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="font-semibold">Veículos:</span> {data.totalVeiculos}</div>
            <div><span className="font-semibold">Pedidos:</span> {data.totalPedidos}</div>
            <div><span className="font-semibold">Peso Total:</span> {data.totalPeso.toLocaleString("pt-BR")} kg</div>
          </div>

          <div className="border-t border-foreground/10" />

          {/* Table */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-foreground/20">
                <th className="text-left py-1.5 pr-2 font-semibold">Carga</th>
                <th className="text-left py-1.5 pr-2 font-semibold">Tipo</th>
                <th className="text-left py-1.5 pr-2 font-semibold">Placa</th>
                <th className="text-left py-1.5 pr-2 font-semibold">Motorista</th>
                <th className="text-right py-1.5 pr-2 font-semibold">Peso (kg)</th>
                <th className="text-center py-1.5 pr-2 font-semibold">Pedidos</th>
                <th className="text-center py-1.5 pr-2 font-semibold">Clientes</th>
                <th className="text-left py-1.5 font-semibold">UFs</th>
              </tr>
            </thead>
            <tbody>
              {data.groups.map((g) => (
                <tr key={g.cargaId} className="border-b border-foreground/5">
                  <td className="py-1 pr-2 font-medium">{g.cargaId}</td>
                  <td className="py-1 pr-2">{g.tipoCaminhao ?? "—"}</td>
                  <td className="py-1 pr-2 font-mono">{g.placa ?? "—"}</td>
                  <td className="py-1 pr-2">{g.motorista ?? "—"}</td>
                  <td className="py-1 pr-2 text-right font-mono">{g.pesoTotal.toLocaleString("pt-BR")}</td>
                  <td className="py-1 pr-2 text-center">{g.qtdPedidos}</td>
                  <td className="py-1 pr-2 text-center">{g.qtdClientes}</td>
                  <td className="py-1">{g.ufs}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer totals */}
          <div className="border-t-2 border-foreground/20 pt-3 flex justify-between items-center text-sm font-bold">
            <span>{data.totalVeiculos} {data.totalVeiculos === 1 ? "veículo" : "veículos"}</span>
            <span>{data.totalPeso.toLocaleString("pt-BR")} kg</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
