import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, X, Trash2, ArrowUpDown } from "lucide-react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import type { Carregamento } from "@/hooks/useCarregamentos";

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
  onSave: (cargaId: string, fields: { nome_carga: string; placa: string; motorista: string; tipo_caminhao: string; transportadora: string }, itemIds: string[]) => void;
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

  useEffect(() => {
    if (group && open) {
      setNomeCarga(group.nomeCarga ?? "");
      setPlaca(group.placa ?? "");
      setMotorista(group.motorista ?? "");
      setTipoCaminhao(group.tipoCaminhao ?? "");
      setTransportadora(group.items[0]?.transportadora ?? "");
      setRemovedIds(new Set());
    }
  }, [group, open]);

  if (!group) return null;

  const visibleItems = group.items.filter((i) => !removedIds.has(i.id));

  const handleSave = () => {
    const ids = visibleItems.map((i) => i.id);
    onSave(group.cargaId, { nome_carga: nomeCarga, placa, motorista, tipo_caminhao: tipoCaminhao, transportadora }, ids);
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium flex items-center gap-1">
                          Pedido {item.numero_pedido ?? "—"} — {item.nome_produto ?? item.codigo_produto ?? "—"}
                          {item.ruptura && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                        </div>
                        <div className="text-muted-foreground whitespace-normal break-words">
                          {item.cliente ?? item.codigo_cliente ?? "—"} • {[item.cidade, item.uf].filter(Boolean).join("/") || "—"} • {(item.peso ?? 0).toLocaleString("pt-BR")} kg
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
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-between gap-2">
            {onDeleteCarga ? (
              <Button
                variant="destructive"
                onClick={() => setConfirmDeleteCarga(true)}
                disabled={saving || deleting}
                className="sm:mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {deleting ? "Apagando…" : "Apagar carga"}
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || deleting || visibleItems.length === 0}>
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
        title="Apagar carga inteira"
        description={`Esta ação apagará TODOS os ${group.items.length} pedido(s) da carga "${group.nomeCarga ?? group.cargaId}" permanentemente. Esta ação não pode ser desfeita.`}
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
