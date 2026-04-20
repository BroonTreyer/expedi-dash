import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Truck, Link2 } from "lucide-react";
import { useCargasFechadasParaVincular, useVincularWalkInACarga, type CargaFechadaAguardando } from "@/hooks/useCarregamentos";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  veiculoEsperado: {
    id: string;
    placa: string;
    motorista?: string | null;
  } | null;
  onVinculado?: () => void;
}

export function VincularCargaDialog({ open, onOpenChange, veiculoEsperado, onVinculado }: Props) {
  const { data: cargas = [], isLoading } = useCargasFechadasParaVincular();
  const vincular = useVincularWalkInACarga();
  const [search, setSearch] = useState("");

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cargas;
    return cargas.filter(
      (c) =>
        (c.nome_carga || "").toLowerCase().includes(q) ||
        (c.carga_id || "").toLowerCase().includes(q) ||
        (c.placa || "").toLowerCase().includes(q) ||
        (c.motorista || "").toLowerCase().includes(q)
    );
  }, [cargas, search]);

  const handleSelect = async (c: CargaFechadaAguardando) => {
    if (!veiculoEsperado) return;
    await vincular.mutateAsync({
      veiculoEsperadoId: veiculoEsperado.id,
      cargaId: c.carga_id,
      placaReal: veiculoEsperado.placa,
      motoristaReal: veiculoEsperado.motorista,
    });
    setSearch("");
    onVinculado?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Vincular {veiculoEsperado?.placa} a uma carga fechada
          </DialogTitle>
          <DialogDescription>
            Escolha a carga abaixo. A placa do veículo no pátio substituirá a placa prevista nos pedidos da carga.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome da carga, placa prevista ou motorista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Carregando cargas fechadas...</p>}
          {!isLoading && filtradas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma carga fechada disponível nos últimos 3 dias.
            </p>
          )}
          {filtradas.map((c) => (
            <button
              key={c.carga_id}
              onClick={() => handleSelect(c)}
              disabled={vincular.isPending}
              className="w-full text-left rounded-md border bg-card hover:bg-accent hover:border-primary/50 transition-colors p-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm truncate">
                      {c.nome_carga || c.carga_id}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-5 font-mono">
                      <Package className="h-3 w-3 mr-1" />
                      {c.qtd_pedidos} {c.qtd_pedidos === 1 ? "pedido" : "pedidos"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {c.peso_total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    {c.placa && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" /> Placa prevista: <span className="font-mono font-medium text-foreground">{c.placa}</span>
                      </span>
                    )}
                    {c.motorista && <span>Motorista: <span className="text-foreground">{c.motorista}</span></span>}
                    {c.tipo_caminhao && <span>Tipo: {c.tipo_caminhao}</span>}
                  </div>
                </div>
                <Link2 className="h-4 w-4 text-primary shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
