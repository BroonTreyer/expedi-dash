import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, X, Undo2, ArrowUpDown, MinusCircle } from "lucide-react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import type { Carregamento } from "@/hooks/useCarregamentos";
import { isRupturaParcial } from "@/lib/peso-utils";

interface CargaGroup {
  cargaId: string;
  nomeCarga: string | null;
  placa: string | null;
  motorista: string | null;
  tipoCaminhao: string | null;
  items: Carregamento[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: CargaGroup | null;
  onSave: (cargaId: string, fields: { nome_carga: string; placa: string; motorista: string; tipo_caminhao: string; transportadora: string }, itemIds: string[], itemUpdates?: Record<string, { peso?: number; motivo_ruptura?: string | null }>) => void;
  onRemoveItem: (itemId: string) => void;
  onDeleteCarga?: (cargaId: string) => void;
  onInverterOrdem?: () => void;
  saving?: boolean;
  deleting?: boolean;
  inverting?: boolean;
}

export function EditarCargaDialog({ open, onOpenChange, group, onSave, onRemoveItem, onDeleteCarga, onInverterOrdem, saving, deleting, inverting }: Props) {
  const [nomeCarga, setNomeCarga] = useState("");
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const [tipoCaminhao, setTipoCaminhao] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Carregamento | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteCarga, setConfirmDeleteCarga] = useState(false);
  // Edições pontuais por item (apenas peso)
  const [itemEdits, setItemEdits] = useState<Record<string, { peso?: number; motivo_ruptura?: string | null }>>({});

  useEffect(() => {
    if (group && open) {
      setNomeCarga(group.nomeCarga ?? "");
      setPlaca(group.placa ?? "");
      setMotorista(group.motorista ?? "");
      setTipoCaminhao(group.tipoCaminhao ?? "");
      setTransportadora(group.items[0]?.transportadora ?? "");
      setRemovedIds(new Set());
      setItemEdits({});
    }
  }, [group, open]);

  if (!group) return null;

  const visibleItems = group.items
    .filter((i) => !removedIds.has(i.id))
    .slice()
    .sort((a, b) => {
      const ao = a.ordem_entrega;
      const bo = b.ordem_entrega;
      if (ao == null && bo == null) return 0;
      if (ao == null) return 1;
      if (bo == null) return -1;
      return ao - bo;
    });

  const handleSave = () => {
    const ids = visibleItems.map((i) => i.id);
    onSave(group.cargaId, { nome_carga: nomeCarga, placa, motorista, tipo_caminhao: tipoCaminhao, transportadora }, ids, itemEdits);
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    onRemoveItem(removeTarget.id);
    setRemovedIds((prev) => new Set(prev).add(removeTarget.id));
    setRemoveTarget(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Carga</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ec-nome">Nome da Carga</Label>
              <Input id="ec-nome" value={nomeCarga} onChange={(e) => setNomeCarga(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ec-placa">Placa</Label>
                <Input id="ec-placa" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ec-motorista">Motorista</Label>
                <Input id="ec-motorista" value={motorista} onChange={(e) => setMotorista(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ec-tipo">Tipo Caminhão</Label>
                <Input id="ec-tipo" value={tipoCaminhao} onChange={(e) => setTipoCaminhao(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ec-transp">Transportadora</Label>
                <Input id="ec-transp" value={transportadora} onChange={(e) => setTransportadora(e.target.value)} />
              </div>
            </div>

            {/* Pedidos list */}
            <div className="space-y-1.5">
              <Label>Pedidos na carga ({visibleItems.length})</Label>
              <div className="border rounded-md divide-y max-h-[55vh] overflow-y-auto">
                {visibleItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">Nenhum pedido restante</p>
                ) : (
                  visibleItems.map((item) => (
                    (() => {
                      const edit = itemEdits[item.id] ?? {};
                      const pesoAtual = edit.peso ?? item.peso ?? 0;
                      const original = item.peso_original ?? item.peso ?? 0;
                      const diff = Math.max(0, original - pesoAtual);
                      const parcial = !item.ruptura && diff > 0 && original > 0;
                      return (
                        <div key={item.id} className="flex flex-col gap-1.5 px-3 py-2 text-xs hover:bg-muted/30">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium flex items-center gap-1.5 flex-wrap">
                                {item.ordem_entrega != null && (
                                  <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold">
                                    #{item.ordem_entrega}
                                  </span>
                                )}
                                <span>Pedido {item.numero_pedido ?? "—"} — {item.nome_produto ?? item.codigo_produto ?? "—"}</span>
                                {item.ruptura && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                                {parcial && <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold rounded px-1.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-400"><MinusCircle className="h-2.5 w-2.5" /> Parcial</span>}
                              </div>
                              <div className="text-muted-foreground whitespace-normal break-words">
                                {item.cliente ?? item.codigo_cliente ?? "—"} • {[item.cidade, item.uf].filter(Boolean).join("/") || "—"}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setRemoveTarget(item)}
                              title="Remover pedido da carga"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {/* Linha de peso */}
                          {!item.ruptura && (
                            <div className="grid grid-cols-1 sm:grid-cols-[auto_auto_1fr] sm:items-center gap-2 pl-1">
                              <div className="flex items-center gap-1.5">
                                <Label htmlFor={`peso-${item.id}`} className="text-[10px] text-muted-foreground">Peso (kg)</Label>
                                <Input
                                  id={`peso-${item.id}`}
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  min="0"
                                  className="h-7 w-24 text-xs"
                                  value={pesoAtual}
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value);
                                    setItemEdits((prev) => ({
                                      ...prev,
                                      [item.id]: { ...prev[item.id], peso: isNaN(v) ? 0 : v },
                                    }));
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                Pedido original: <span className="font-mono font-medium text-foreground">{original.toLocaleString("pt-BR")} kg</span>
                              </span>
                              {parcial && (
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                                    → Ruptura parcial: {diff.toLocaleString("pt-BR")} kg
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          {item.ruptura && (
                            <div className="text-[10px] text-muted-foreground pl-1">
                              {(item.peso ?? 0).toLocaleString("pt-BR")} kg (em ruptura total)
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <div className="flex flex-col sm:flex-row gap-2 sm:mr-auto w-full sm:w-auto">
              {onDeleteCarga && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmDeleteCarga(true)}
                  disabled={saving || deleting || inverting}
                  title="Os pedidos voltam para Vendas (não são apagados)"
                  className="w-full sm:w-auto"
                >
                  <Undo2 className="h-4 w-4 mr-1" />
                  {deleting ? "Desfazendo…" : (
                    <>
                      <span className="md:hidden">Desfazer carga ({group.items.length})</span>
                      <span className="hidden md:inline">{`Desfazer carga (${group.items.length} pedido${group.items.length !== 1 ? "s" : ""} voltam para Vendas)`}</span>
                    </>
                  )}
                </Button>
              )}
              {onInverterOrdem && (
                <Button
                  variant="outline"
                  onClick={() => onInverterOrdem()}
                  disabled={saving || deleting || inverting || visibleItems.filter((i) => i.ordem_entrega != null).length < 2}
                  title="Inverter sequência de entrega"
                  className="w-full sm:w-auto"
                >
                  <ArrowUpDown className="h-4 w-4 mr-1" />
                  {inverting ? "Invertendo…" : "Inverter ordem"}
                </Button>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || deleting || inverting || visibleItems.length === 0} className="w-full sm:w-auto">
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={confirmDeleteCarga}
        onOpenChange={setConfirmDeleteCarga}
        onConfirm={() => {
          if (group && onDeleteCarga) onDeleteCarga(group.cargaId);
          setConfirmDeleteCarga(false);
        }}
        title={`Desfazer carga "${group.nomeCarga ?? group.cargaId}"`}
        description={`Os ${group.items.length} pedido${group.items.length !== 1 ? "s" : ""} desta carga voltarão para a etapa Vendas e poderão ser agrupados em uma nova carga. Nenhum dado de produto, cliente ou pedido será perdido.`}
        confirmLabel={`Desfazer carga (${group.items.length} pedido${group.items.length !== 1 ? "s" : ""})`}
      />

      <DeleteConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        onConfirm={confirmRemove}
        title="Remover pedido da carga"
        description={`Deseja remover o pedido ${removeTarget?.numero_pedido ?? ""} (${removeTarget?.nome_produto ?? ""}) desta carga? O pedido voltará para a etapa de Vendas.`}
      />
    </>
  );
}
