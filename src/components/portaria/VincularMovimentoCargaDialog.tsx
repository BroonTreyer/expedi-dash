import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Package, Link2 } from "lucide-react";
import { useCargasFechadasParaVincular, useVincularMovimentoACarga } from "@/hooks/useCarregamentos";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  movimento: MovimentacaoPortaria | null;
}

export function VincularMovimentoCargaDialog({ open, onOpenChange, movimento }: Props) {
  const { data: cargas = [], isLoading } = useCargasFechadasParaVincular();
  const vincular = useVincularMovimentoACarga();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Mostra apenas cargas terceirizadas (com transportadora) e prioriza as
  // que ainda não têm placa atribuída ou cuja placa já casa com a do veículo.
  const placaMov = (movimento?.placa || "").trim().toUpperCase();
  const filteredCargas = useMemo(() => {
    return cargas
      .filter((c) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          c.carga_id?.toLowerCase().includes(s) ||
          c.nome_carga?.toLowerCase().includes(s) ||
          c.transportadora?.toLowerCase().includes(s) ||
          c.motorista?.toLowerCase().includes(s)
        );
      })
      .sort((a, b) => {
        // Prioriza: placa coincide > sem placa > placa diferente.
        const score = (c: typeof a) => {
          const p = (c.placa || "").trim().toUpperCase();
          if (p && p === placaMov) return 0;
          if (!p) return 1;
          return 2;
        };
        return score(a) - score(b);
      });
  }, [cargas, search, placaMov]);

  const handleConfirm = async () => {
    if (!movimento || !selectedId) return;
    const carga = cargas.find((c) => c.carga_id === selectedId);
    if (!carga) return;
    await vincular.mutateAsync({
      movimentoId: movimento.id,
      cargaId: carga.carga_id,
      placaReal: movimento.placa || carga.placa || "",
      motoristaReal: movimento.motorista || carga.motorista || null,
      transportadoraReal: carga.transportadora || null,
    });
    setSelectedId(null);
    setSearch("");
    onOpenChange(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelectedId(null);
      setSearch("");
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Vincular carga ao motorista
          </DialogTitle>
          <DialogDescription>
            {movimento ? (
              <>
                Selecione a carga fechada que será atribuída a{" "}
                <strong className="font-mono">{movimento.placa}</strong>
                {movimento.motorista && <> — {movimento.motorista}</>}.
              </>
            ) : (
              "Selecione uma carga"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por carga, transportadora ou motorista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[360px] border rounded-md">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Carregando cargas...
            </div>
          ) : filteredCargas.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nenhuma carga terceirizada disponível para vínculo.
              <p className="text-xs mt-1">
                A Logística precisa fechar uma carga com transportadora antes.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredCargas.map((c) => {
                const isSelected = selectedId === c.carga_id;
                const placaCarga = (c.placa || "").trim().toUpperCase();
                const placaMatch = placaCarga && placaCarga === placaMov;
                return (
                  <button
                    key={c.carga_id}
                    type="button"
                    onClick={() => setSelectedId(c.carga_id)}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/10 hover:bg-primary/15" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{c.nome_carga || c.carga_id}</span>
                          {c.is_pre_carga && (
                            <Badge variant="outline" className="text-[10px] h-5 border-amber-500/50 text-amber-700 dark:text-amber-300">
                              Pré-carga
                            </Badge>
                          )}
                          {placaMatch && (
                            <Badge variant="default" className="text-[10px] h-5 bg-emerald-600">
                              Placa coincide
                            </Badge>
                          )}
                          {!c.placa && (
                            <Badge variant="outline" className="text-[10px] h-5">
                              Sem placa atribuída
                            </Badge>
                          )}
                          {c.placa && !placaMatch && (
                            <Badge variant="outline" className="text-[10px] h-5 border-amber-500/50 text-amber-700 dark:text-amber-400">
                              Placa diferente: {c.placa}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {c.transportadora}
                          {c.motorista && <> · {c.motorista}</>}
                          {c.tipo_caminhao && <> · {c.tipo_caminhao}</>}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {c.qtd_pedidos} pedido{c.qtd_pedidos !== 1 ? "s" : ""} ·{" "}
                          {c.peso_total.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={vincular.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId || vincular.isPending}
            className="gap-2"
          >
            {vincular.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Vincular carga
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}