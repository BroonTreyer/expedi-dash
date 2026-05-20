import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, X, Undo2, ArrowUpDown, MinusCircle, CheckCircle2, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import type { Carregamento } from "@/hooks/useCarregamentos";
import { isRupturaParcial } from "@/lib/peso-utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EditarPedidoAprovacaoDialog } from "@/components/aprovacoes/EditarPedidoAprovacaoDialog";

interface CargaGroup {
  cargaId: string;
  nomeCarga: string | null;
  ordemCarga: string | null;
  placa: string | null;
  motorista: string | null;
  tipoCaminhao: string | null;
  items: Carregamento[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: CargaGroup | null;
  onSave: (cargaId: string, fields: { nome_carga: string; ordem_carga: string; placa: string; motorista: string; tipo_caminhao: string; transportadora: string }, itemIds: string[], itemUpdates?: Record<string, { peso?: number; quantidade?: number; motivo_ruptura?: string | null }>, ordemUpdates?: Record<string, number>) => void;
  onRemoveItem: (itemId: string) => void;
  onDeleteCarga?: (cargaId: string) => void;
  onInverterOrdem?: () => void;
  saving?: boolean;
  deleting?: boolean;
  inverting?: boolean;
}

export function EditarCargaDialog({ open, onOpenChange, group, onSave, onRemoveItem, onDeleteCarga, onInverterOrdem, saving, deleting, inverting }: Props) {
  const [nomeCarga, setNomeCarga] = useState("");
  const [ordemCarga, setOrdemCarga] = useState("");
  const [placa, setPlaca] = useState("");
  const [motorista, setMotorista] = useState("");
  const [tipoCaminhao, setTipoCaminhao] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Carregamento | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteCarga, setConfirmDeleteCarga] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "searching" | "found" | "notfound">("idle");
  const [lookupInfo, setLookupInfo] = useState<string>("");
  // Pedido (parada) selecionado para edição via EditarPedidoAprovacaoDialog
  const [pedidoEditando, setPedidoEditando] = useState<Carregamento[] | null>(null);
  // Ordem manual por chave de cliente (codigo_cliente || nome). Inicializa do banco.
  const [ordemPorCliente, setOrdemPorCliente] = useState<Record<string, number>>({});
  // Marca true assim que o usuário reordena manualmente (passa a persistir 1..N para todas as paradas)
  const [ordemDirty, setOrdemDirty] = useState(false);

  useEffect(() => {
    if (group && open) {
      setNomeCarga(group.nomeCarga ?? "");
      setOrdemCarga(group.ordemCarga ?? "");
      setPlaca(group.placa ?? "");
      setMotorista(group.motorista ?? "");
      setTipoCaminhao(group.tipoCaminhao ?? "");
      setTransportadora(group.items[0]?.transportadora ?? "");
      setRemovedIds(new Set());
      setPedidoEditando(null);
      // Inicializa ordem por cliente a partir dos pedidos existentes
      const map: Record<string, number> = {};
      for (const it of group.items) {
        const key = it.codigo_cliente ?? `__${it.cliente ?? "—"}`;
        const ord = it.ordem_entrega;
        if (ord != null && (map[key] == null || ord < map[key])) {
          map[key] = ord;
        }
      }
      setOrdemPorCliente(map);
      setOrdemDirty(false);
      setLookupStatus("idle");
      setLookupInfo("");
    }
  }, [group, open]);

  // Auto-fill motorista, transportadora e tipo a partir do cadastro de caminhões quando placa muda
  useEffect(() => {
    if (!open) return;
    const placaNorm = placa.trim().toUpperCase();
    if (placaNorm.length < 5) {
      setLookupStatus("idle");
      setLookupInfo("");
      return;
    }
    let cancelled = false;
    setLookupStatus("searching");
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("caminhoes")
        .select("placa, transportadora, tipo_caminhao, motoristas:motorista_id(nome_completo)")
        .ilike("placa", placaNorm)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setLookupStatus("notfound");
        setLookupInfo("");
        return;
      }
      const nomeMotorista = (data as any).motoristas?.nome_completo ?? "";
      const transp = data.transportadora ?? "";
      const tipo = data.tipo_caminhao ?? "";
      // Sempre sobrescrever para garantir consistência com o cadastro
      if (nomeMotorista) setMotorista(nomeMotorista);
      if (transp) setTransportadora(transp);
      if (tipo) setTipoCaminhao(tipo);
      setLookupStatus("found");
      setLookupInfo([nomeMotorista, transp, tipo].filter(Boolean).join(" • "));
      toast.success("Dados do caminhão preenchidos pelo cadastro");
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placa, open]);

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

  // Agrupa por cliente preservando a ordem atual do dialog
  const clienteKey = (it: Carregamento) => it.codigo_cliente ?? `__${it.cliente ?? "—"}`;
  const clienteGroups: { key: string; nome: string; cidade: string; itens: Carregamento[]; ordemAtual: number }[] = (() => {
    const map = new Map<string, { key: string; nome: string; cidade: string; itens: Carregamento[]; ordemAtual: number }>();
    for (const it of visibleItems) {
      const k = clienteKey(it);
      let g = map.get(k);
      if (!g) {
        g = {
          key: k,
          nome: it.cliente ?? it.codigo_cliente ?? "—",
          cidade: [it.cidade, it.uf].filter(Boolean).join("/") || "—",
          itens: [],
          ordemAtual: ordemPorCliente[k] ?? 9999,
        };
        map.set(k, g);
      }
      g.itens.push(it);
    }
    const arr = Array.from(map.values()).sort((a, b) => a.ordemAtual - b.ordemAtual);
    // Atribui posição sequencial (1..N) para paradas sem ordem definida — apenas visual,
    // só vira persistência se o usuário reordenar (ordemDirty).
    arr.forEach((g, i) => {
      if (g.ordemAtual === 9999) g.ordemAtual = i + 1;
    });
    return arr;
  })();

  const totalParadas = clienteGroups.length;
  const podeReordenar = totalParadas >= 2;

  const reorderTo = (key: string, novaPos: number) => {
    if (novaPos < 1) novaPos = 1;
    if (novaPos > totalParadas) novaPos = totalParadas;
    // Lista atual ordenada
    const lista = clienteGroups.map((g) => g.key);
    const atualIdx = lista.indexOf(key);
    if (atualIdx < 0) return;
    lista.splice(atualIdx, 1);
    lista.splice(novaPos - 1, 0, key);
    const next: Record<string, number> = {};
    lista.forEach((k, i) => { next[k] = i + 1; });
    setOrdemPorCliente(next);
    setOrdemDirty(true);
  };

  const moveBy = (key: string, delta: number) => {
    const grupo = clienteGroups.find((g) => g.key === key);
    if (!grupo) return;
    reorderTo(key, grupo.ordemAtual + delta);
  };

  const handleSave = () => {
    const ids = visibleItems.map((i) => i.id);
    // Monta ordemUpdates apenas se o usuário reordenou manualmente — então grava 1..N
    // para todos os itens (mesmo os que ainda não tinham ordem_entrega no banco).
    let ordemUpdates: Record<string, number> | undefined;
    if (ordemDirty && podeReordenar) {
      const ordemPorKey: Record<string, number> = {};
      clienteGroups.forEach((g) => { ordemPorKey[g.key] = g.ordemAtual; });
      ordemUpdates = {};
      for (const it of visibleItems) {
        const k = clienteKey(it);
        const ord = ordemPorKey[k];
        if (ord != null) ordemUpdates[it.id] = ord;
      }
      if (Object.keys(ordemUpdates).length === 0) ordemUpdates = undefined;
    }
    onSave(group.cargaId, { nome_carga: nomeCarga, ordem_carga: ordemCarga, placa, motorista, tipo_caminhao: tipoCaminhao, transportadora }, ids, undefined, ordemUpdates);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ec-nome">Nome da Carga</Label>
                <Input id="ec-nome" value={nomeCarga} onChange={(e) => setNomeCarga(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ec-ordem-carga">Ordem de Carga</Label>
                <Input id="ec-ordem-carga" value={ordemCarga} onChange={(e) => setOrdemCarga(e.target.value)} placeholder="Ex: OC-1234" />
                <p className="text-[10px] text-muted-foreground">Usada para vincular o CT-e/DACTE a esta carga.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ec-placa">Placa</Label>
                <Input id="ec-placa" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} />
                {lookupStatus === "found" && lookupInfo && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 shrink-0" /> <span className="truncate">{lookupInfo}</span>
                  </p>
                )}
                {lookupStatus === "notfound" && (
                  <p className="text-[10px] text-muted-foreground">Placa não cadastrada — preencha manualmente</p>
                )}
                {lookupStatus === "searching" && (
                  <p className="text-[10px] text-muted-foreground">Buscando cadastro…</p>
                )}
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
              <Label>
                Pedidos na carga ({visibleItems.length}) — {totalParadas} parada{totalParadas !== 1 ? "s" : ""}
                {podeReordenar && (
                  <span className="ml-2 text-[10px] font-normal text-muted-foreground">— use ↑/↓ ou digite a posição para reordenar</span>
                )}
              </Label>
              <div className="border rounded-md divide-y max-h-[55vh] overflow-y-auto">
                {visibleItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">Nenhum pedido restante</p>
                ) : (
                  clienteGroups.map((cg) => {
                    const ordAtual = cg.ordemAtual;
                    return (
                      <div key={cg.key} className="bg-background">
                        {/* Cabeçalho da parada (cliente) */}
                        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/40 border-b">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md bg-primary/15 text-primary text-[11px] font-bold">
                              #{ordAtual}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{cg.nome}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{cg.cidade} • {cg.itens.length} item{cg.itens.length !== 1 ? "ns" : ""}</div>
                            </div>
                          </div>
                          {podeReordenar && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => moveBy(cg.key, -1)}
                                disabled={ordAtual <= 1}
                                title="Subir parada"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              <Input
                                type="number"
                                min={1}
                                max={totalParadas}
                                value={ordAtual}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10);
                                  if (!isNaN(v)) reorderTo(cg.key, v);
                                }}
                                className="h-6 w-12 text-xs text-center px-1"
                                title="Posição da parada"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => moveBy(cg.key, +1)}
                                disabled={ordAtual >= totalParadas}
                                title="Descer parada"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {/* Resumo agregado da parada (somente cliente, sem produtos) */}
                        {(() => {
                          const pesoCliente = cg.itens.reduce(
                            (s, it) => s + (it.ruptura ? 0 : (it.peso ?? 0)),
                            0,
                          );
                          const rupturas = cg.itens.filter((it) => it.ruptura).length;
                          const parciais = cg.itens.filter((it) => {
                            const orig = it.peso_original ?? it.peso ?? 0;
                            return !it.ruptura && orig > 0 && (it.peso ?? 0) < orig;
                          }).length;
                          return (
                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5 text-[11px] text-muted-foreground">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span>
                                  Peso: <span className="font-mono font-medium text-foreground">{pesoCliente.toLocaleString("pt-BR")} kg</span>
                                </span>
                                {rupturas > 0 && (
                                  <span className="inline-flex items-center gap-1 text-destructive font-medium">
                                    <AlertTriangle className="h-3 w-3" /> {rupturas} ruptura{rupturas !== 1 ? "s" : ""}
                                  </span>
                                )}
                                {parciais > 0 && (
                                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                                    <MinusCircle className="h-3 w-3" /> {parciais} parcial{parciais !== 1 ? "is" : ""}
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                                onClick={() => cg.itens.forEach((it) => { onRemoveItem(it.id); setRemovedIds((prev) => { const n = new Set(prev); n.add(it.id); return n; }); })}
                                title="Remover esta parada (cliente) da carga"
                              >
                                <X className="h-3 w-3 mr-1" /> Remover parada
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => setPedidoEditando(cg.itens)}
                                title="Editar itens deste pedido (peso, quantidade, adicionar/remover produtos)"
                              >
                                <Pencil className="h-3 w-3 mr-1" /> Editar pedido
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
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

      <EditarPedidoAprovacaoDialog
        open={!!pedidoEditando}
        onOpenChange={(o) => { if (!o) setPedidoEditando(null); }}
        grupo={pedidoEditando}
        preCargaContext={pedidoEditando ? {
          carga_id: group.cargaId,
          nome_carga: group.nomeCarga,
          placa: placa || group.placa,
          motorista: motorista || group.motorista,
          transportadora: transportadora || (group.items[0]?.transportadora ?? null),
          tipo_caminhao: tipoCaminhao || group.tipoCaminhao,
          ordem_carga: ordemCarga || group.ordemCarga,
          etapaAlvo: group.items[0]?.etapa ?? null,
        } : null}
      />
    </>
  );
}
