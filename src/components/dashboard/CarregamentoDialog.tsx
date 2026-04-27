import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATUSES, UF_LIST, isPorUnidade } from "@/lib/constants";
import { Plus, X } from "lucide-react";
import type { Carregamento } from "@/hooks/useCarregamentos";

export type DialogMode = "vendas" | "logistica" | "editar";

interface ProductItem {
  codigo_produto: string;
  nome_produto: string;
  quantidade: number;
  peso: number;
  pesoPadrao: number;
  ruptura: boolean;
  pesoManual: boolean;
  originalId?: string;
}

const emptyItem = (): ProductItem => ({
  codigo_produto: "",
  nome_produto: "",
  quantidade: 1,
  peso: 0,
  pesoPadrao: 0,
  ruptura: false,
  pesoManual: true,
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, any>) => void;
  editing: Carregamento | null;
  mode: DialogMode;
  vendedores: { id: string; nome_vendedor: string; codigo_vendedor: string }[];
  tiposCaminhao: { nome_tipo: string }[];
  produtos: { codigo_produto: string; nome_produto: string; peso_padrao: number | null }[];
  clientes: { codigo_cliente: string; nome_cliente: string; cidade?: string | null; uf?: string | null }[];
  selectedDate: string;
  defaultRuptura?: boolean;
  cloneItems?: Carregamento[];
  /** When true, all rows in cloneItems represent siblings of the same order being edited together. */
  editingGroup?: boolean;
  isSubmitting?: boolean;
}

const TITLES: Record<DialogMode, string> = {
  vendas: "Novo Pedido (Vendas)",
  logistica: "Completar Logística",
  editar: "Editar Carregamento",
};

const DESCRIPTIONS: Record<DialogMode, string> = {
  vendas: "Preencha os dados comerciais do pedido",
  logistica: "Preencha os dados de transporte para este carregamento",
  editar: "Edite todos os campos do carregamento",
};

export function CarregamentoDialog({ open, onOpenChange, onSubmit, editing, mode, vendedores, tiposCaminhao, produtos, clientes, selectedDate, defaultRuptura, cloneItems, editingGroup, isSubmitting }: Props) {
  const session = useSession();
  const [form, setForm] = useState<Record<string, any>>({});
  const [codigoVendedorInput, setCodigoVendedorInput] = useState("");
  const [codigoClienteInput, setCodigoClienteInput] = useState("");
  const [debouncedClienteCode, setDebouncedClienteCode] = useState("");
  const clienteDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [items, setItems] = useState<ProductItem[]>([emptyItem()]);
  const lastInitId = useRef<string | null>(null);
  // Anti double-submit guard: blocks re-entrant submits within the same dialog session
  const submitGuard = useRef<boolean>(false);

  const handleDialogOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      lastInitId.current = null;
      submitGuard.current = false;
    }
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    if (!editing) return;
    if (lastInitId.current === editing.id) return;

    const vendedor = vendedores.find((v) => v.id === editing.vendedor_id);
    const produto = produtos.find((p) => p.codigo_produto === editing.codigo_produto);
    const pesoPadrao = Number(produto?.peso_padrao ?? 0);

    lastInitId.current = editing.id;
    setForm({ ...editing });
    setCodigoVendedorInput(vendedor?.codigo_vendedor ?? "");
    setCodigoClienteInput(editing.codigo_cliente ?? "");

    // If cloning with multiple sibling items, populate all of them
    const sourceRows = (cloneItems && cloneItems.length >= 1) ? cloneItems : [editing];
    setItems(sourceRows.map(row => {
      const prod = produtos.find((p) => p.codigo_produto === row.codigo_produto);
      const pp = Number(prod?.peso_padrao ?? 0);
      return {
        codigo_produto: row.codigo_produto ?? "",
        nome_produto: row.nome_produto ?? "",
        quantidade: row.quantidade ?? 1,
        peso: row.peso ?? 0,
        pesoPadrao: pp,
        ruptura: row.ruptura ?? false,
        pesoManual: true,
        // Track original DB id only when editing a full group
        originalId: editingGroup ? row.id : undefined,
      };
    }));
  }, [editing, open, produtos, vendedores, cloneItems, editingGroup]);

  useEffect(() => {
    if (!open) return;
    if (editing) return;

    setForm({ data: selectedDate, status: "Aguardando", etapa: "vendas", ruptura: defaultRuptura ?? false });
    setCodigoVendedorInput("");
    setCodigoClienteInput("");
    setItems([emptyItem()]);
  }, [editing, open, selectedDate, defaultRuptura]);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleCodigoVendedor = (codigo: string) => {
    const found = vendedores.find((v) => v.codigo_vendedor === codigo);
    if (found) {
      set("vendedor_id", found.id);
    }
  };

  // Debounce client code lookup (300ms)
  useEffect(() => {
    if (clienteDebounceRef.current) clearTimeout(clienteDebounceRef.current);
    if (codigoClienteInput.length >= 1) {
      clienteDebounceRef.current = setTimeout(() => {
        setDebouncedClienteCode(codigoClienteInput.trim());
      }, 300);
    } else {
      setDebouncedClienteCode("");
    }
    return () => { if (clienteDebounceRef.current) clearTimeout(clienteDebounceRef.current); };
  }, [codigoClienteInput]);

  // On-demand client lookup by code — avoids loading 5000+ clients
  const { data: lookedUpCliente } = useQuery({
    queryKey: ["cliente-lookup", debouncedClienteCode],
    enabled: debouncedClienteCode.length >= 1 && !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes")
        .select("codigo_cliente, nome_cliente, cidade, uf")
        .eq("codigo_cliente", debouncedClienteCode)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleCodigoCliente = useCallback((codigo: string) => {
    // Also check the provided clientes list (from carregamentos data)
    const found = clientes.find((c) => c.codigo_cliente.toLowerCase() === codigo.toLowerCase());
    if (found) {
      set("cliente", found.nome_cliente);
      set("codigo_cliente", found.codigo_cliente);
      set("cidade", found.cidade ?? "");
      set("uf", found.uf ?? "");
    }
  }, [clientes]);

  // When lookup returns data, auto-fill
  useEffect(() => {
    if (lookedUpCliente && codigoClienteInput) {
      set("cliente", lookedUpCliente.nome_cliente);
      set("codigo_cliente", lookedUpCliente.codigo_cliente);
      set("cidade", lookedUpCliente.cidade ?? "");
      set("uf", lookedUpCliente.uf ?? "");
    }
  }, [lookedUpCliente]);

  const updateItem = (index: number, updates: Partial<ProductItem>) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const handleItemCodigo = (index: number, codigo: string) => {
    const found = produtos.find((p) => p.codigo_produto.toLowerCase() === codigo.toLowerCase());
    if (found) {
      const pp = found.peso_padrao ?? 0;
      const item = items[index];
      // Only auto-fill weight on brand new items (peso === 0)
      if (item.peso === 0 && pp > 0) {
        updateItem(index, {
          codigo_produto: codigo,
          nome_produto: found.nome_produto,
          pesoPadrao: pp,
          peso: pp * (item.quantidade ?? 1),
          pesoManual: true,
        });
      } else {
        updateItem(index, {
          codigo_produto: codigo,
          nome_produto: found.nome_produto,
          pesoPadrao: pp,
          pesoManual: true,
        });
      }
    } else {
      updateItem(index, {
        codigo_produto: codigo,
        nome_produto: "",
        pesoPadrao: 0,
        pesoManual: true,
      });
    }
  };

  const handleItemQuantidade = (index: number, qty: number) => {
    const item = items[index];
    if (item.pesoPadrao > 0) {
      updateItem(index, { quantidade: qty, peso: item.pesoPadrao * qty });
    } else {
      updateItem(index, { quantidade: qty });
    }
  };

  const handleItemPeso = (index: number, peso: number) => {
    const item = items[index];
    // For unit-based products (Pão de Alho), only update weight — quantity stays manual
    if (isPorUnidade(item.nome_produto) || item.pesoPadrao <= 0) {
      updateItem(index, { peso, pesoManual: true });
    } else {
      // For normal products, recalculate quantity from weight
      const qty = Math.round(peso / item.pesoPadrao);
      updateItem(index, { peso, quantidade: qty, pesoManual: true });
    }
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    // Block re-entrant submits (double-click protection)
    if (submitGuard.current || isSubmitting) return;
    submitGuard.current = true;

    // Clean payload: remove system/read-only fields
    const SYSTEM_FIELDS = ['id', 'vendedores', 'codigo_produto', 'nome_produto', 'quantidade', 'peso', 'peso_manual', 'created_at', 'updated_at', 'ruptura_sinalizada'];
    const basePayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(form)) {
      if (!SYSTEM_FIELDS.includes(key)) {
        basePayload[key] = value;
      }
    }

    // Use item values directly — weight is always manual
    const finalItems = items.map(item => ({
      ...item,
      pesoManual: true,
    }));

    if (mode === "logistica") {
      basePayload.etapa = "logistica";
    }

    if (editing && editing.id && !editing.id.startsWith("clone-")) {
      // First item is the main update; additional items are inserts (or updates when editingGroup)
      const firstItem = finalItems[0];
      const updatePayload = {
        ...basePayload,
        id: editing.id,
        codigo_produto: firstItem.codigo_produto,
        nome_produto: firstItem.nome_produto,
        quantidade: firstItem.quantidade,
        peso: firstItem.peso,
        peso_manual: firstItem.pesoManual,
        ruptura: firstItem.ruptura,
      };

      if (editingGroup && cloneItems && cloneItems.length > 0) {
        // Group edit: classify each "extra" item as update (originalId) or insert
        const batchUpdates: Record<string, any>[] = [];
        const batchInserts: Record<string, any>[] = [];
        for (const item of finalItems.slice(1)) {
          const row = {
            ...basePayload,
            codigo_produto: item.codigo_produto,
            nome_produto: item.nome_produto,
            quantidade: item.quantidade,
            peso: item.peso,
            peso_manual: item.pesoManual,
            ruptura: item.ruptura,
          };
          if ((item as any).originalId) {
            batchUpdates.push({ id: (item as any).originalId, ...row });
          } else {
            batchInserts.push(row);
          }
        }
        // Detect rows the user removed: present in cloneItems but not among kept originalIds
        const keptIds = new Set(
          finalItems
            .map((it) => (it as any).originalId)
            .filter((id): id is string => !!id)
        );
        keptIds.add(editing.id);
        const deleteIds = cloneItems
          .map((c) => c.id)
          .filter((id) => !keptIds.has(id));

        onSubmit({
          ...updatePayload,
          _batchUpdates: batchUpdates,
          _batch: batchInserts,
          _deleteIds: deleteIds,
          _editingGroup: true,
        });
      } else if (finalItems.length > 1) {
        const extraRows = finalItems.slice(1).map(item => ({
          ...basePayload,
          codigo_produto: item.codigo_produto,
          nome_produto: item.nome_produto,
          quantidade: item.quantidade,
          peso: item.peso,
          peso_manual: item.pesoManual,
          ruptura: item.ruptura,
        }));
        onSubmit({ ...updatePayload, _batch: extraRows });
      } else {
        onSubmit(updatePayload);
      }
    } else {
      const batchRows = finalItems.map(item => ({
        ...basePayload,
        codigo_produto: item.codigo_produto,
        nome_produto: item.nome_produto,
        quantidade: item.quantidade,
        peso: item.peso,
        peso_manual: item.pesoManual,
        ruptura: item.ruptura,
      }));
      if (batchRows.length === 1) {
        onSubmit(batchRows[0]);
      } else {
        onSubmit({ _batch: batchRows });
      }
    }
    handleDialogOpenChange(false);
  };

  const showVendas = mode === "vendas" || mode === "editar";
  const showLogistica = mode === "logistica" || mode === "editar";

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>{TITLES[mode]}</DialogTitle>
          <DialogDescription>{DESCRIPTIONS[mode]}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* === VENDAS FIELDS === */}
          {showVendas && (
            <>
              {/* Primeira linha: Data, N° Pedido, Cidade, UF, Frete */}
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={form.data ?? ""} onChange={(e) => set("data", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">N° Pedido</Label>
                  <Input
                    type="number"
                    value={form.numero_pedido ?? ""}
                    onChange={(e) => set("numero_pedido", e.target.value ? Number(e.target.value) : null)}
                    placeholder="Ex: 1234"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cidade</Label>
                  <Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} placeholder="Ex: São Paulo" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">UF</Label>
                  <Select value={form.uf ?? ""} onValueChange={(v) => set("uf", v)}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>{UF_LIST.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Frete</Label>
                  <Select value={form.tipo_frete ?? ""} onValueChange={(v) => set("tipo_frete", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CIF">CIF</SelectItem>
                      <SelectItem value="FOB">FOB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cód. Vendedor</Label>
                <Input
                  value={codigoVendedorInput}
                  onChange={(e) => {
                    const codigo = e.target.value;
                    setCodigoVendedorInput(codigo);
                    handleCodigoVendedor(codigo);
                  }}
                  placeholder="Ex: 114"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vendedor *</Label>
                <Select value={form.vendedor_id ?? ""} onValueChange={(v) => set("vendedor_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.codigo_vendedor} - {v.nome_vendedor}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cód. Cliente</Label>
                <Input
                  value={codigoClienteInput}
                  onChange={(e) => {
                    const codigo = e.target.value;
                    setCodigoClienteInput(codigo);
                    handleCodigoCliente(codigo);
                  }}
                  placeholder="Ex: 001"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente</Label>
                <Input value={form.cliente ?? ""} readOnly className="bg-muted/50" placeholder="Auto-preenchido" />
              </div>

              {/* === PRODUCT ITEMS === */}
              <div className="sm:col-span-2 border-t border-border pt-3 mt-1 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Produtos</span>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_1.5fr_100px_80px_auto_32px] sm:gap-2 sm:items-end border-b border-border pb-3 sm:border-0 sm:pb-0">
                    <div className="space-y-1">
                      <Label className="text-xs sm:hidden">Código</Label>
                      {idx === 0 && <Label className="text-xs hidden sm:block">Código</Label>}
                      <Input
                        value={item.codigo_produto}
                        onChange={(e) => handleItemCodigo(idx, e.target.value)}
                        placeholder="Código"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs sm:hidden">Nome Produto</Label>
                      {idx === 0 && <Label className="text-xs hidden sm:block">Nome Produto</Label>}
                      <Input value={item.nome_produto} readOnly className="h-9 text-sm bg-muted/50" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:contents">
                      <div className="space-y-1">
                        <Label className="text-xs sm:hidden">Peso (kg)</Label>
                        {idx === 0 && <Label className="text-xs hidden sm:block">Peso (kg)</Label>}
                        <Input
                          type="number"
                          value={item.peso}
                          onChange={(e) => handleItemPeso(idx, Number(e.target.value))}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs sm:hidden">Qtd</Label>
                        {idx === 0 && <Label className="text-xs hidden sm:block">Qtd</Label>}
                        <Input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => handleItemQuantidade(idx, Number(e.target.value))}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      {idx === 0 && <Label className="text-xs hidden sm:block">Ruptura</Label>}
                      <div className="flex items-center gap-1.5 h-9 sm:justify-center">
                        <Checkbox
                          id={`ruptura-${idx}`}
                          checked={item.ruptura}
                          onCheckedChange={(checked) => updateItem(idx, { ruptura: !!checked })}
                        />
                        <Label htmlFor={`ruptura-${idx}`} className="text-xs text-amber-600 cursor-pointer sm:hidden">
                          Ruptura
                        </Label>
                      </div>
                    </div>
                    <div className="flex justify-end sm:block">
                      {items.length > 1 ? (
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-8 text-destructive" onClick={() => removeItem(idx)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      ) : <div className="h-9 w-8 hidden sm:block" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totais do pedido — derivados em tempo real */}
              <div className="sm:col-span-2 bg-muted/30 rounded-md p-2.5 flex flex-wrap items-center justify-between gap-2 border">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total do Pedido
                </span>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold">
                    {items.length} <span className="font-normal text-muted-foreground">{items.length === 1 ? "produto" : "produtos"}</span>
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-semibold">
                    {items.reduce((s, i) => s + (Number(i.quantidade) || 0), 0).toLocaleString("pt-BR")}{" "}
                    <span className="font-normal text-muted-foreground">un</span>
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-semibold">
                    {items.reduce((s, i) => s + (Number(i.peso) || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                    <span className="font-normal text-muted-foreground">kg</span>
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Observações</Label>
                <Textarea value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} rows={2} />
              </div>
            </>
          )}

          {/* === LOGÍSTICA FIELDS === */}
          {showLogistica && (
            <>
              {mode === "editar" && (
                <div className="sm:col-span-2 border-t border-border pt-3 mt-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados de Transporte</span>
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Nome da Carga</Label>
                <Input
                  value={form.carga_id ?? ""}
                  onChange={(e) => set("carga_id", e.target.value)}
                  placeholder="Ex: CG-20260318-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo Caminhão *</Label>
                <Select value={form.tipo_caminhao ?? ""} onValueChange={(v) => set("tipo_caminhao", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{tiposCaminhao.map((t) => <SelectItem key={t.nome_tipo} value={t.nome_tipo}>{t.nome_tipo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Motorista *</Label>
                <Input value={form.motorista ?? ""} onChange={(e) => set("motorista", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Placa *</Label>
                <Input value={form.placa ?? ""} onChange={(e) => set("placa", e.target.value.toUpperCase())} placeholder="ABC1D23" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Transportadora</Label>
                <Input value={form.transportadora ?? ""} onChange={(e) => set("transportadora", e.target.value)} placeholder="Ex: Transportes XYZ" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Horário Previsto</Label>
                <Input type="time" value={form.horario_previsto ?? ""} onChange={(e) => set("horario_previsto", e.target.value)} />
              </div>
              {mode === "editar" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status ?? "Aguardando"} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Info summary when in logistica mode */}
          {mode === "logistica" && editing && (
            <div className="sm:col-span-2 rounded-md bg-muted/50 p-3 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados do Pedido</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
                <span className="text-muted-foreground">Vendedor:</span>
                <span>{editing.vendedores?.nome_vendedor ?? "—"}</span>
                <span className="text-muted-foreground">Produto:</span>
                <span>{editing.nome_produto ?? editing.codigo_produto ?? "—"}</span>
                <span className="text-muted-foreground">Qtd / Peso:</span>
                <span>{editing.quantidade ?? 0} un / {(editing.peso ?? 0).toLocaleString("pt-BR")} kg</span>
                <span className="text-muted-foreground">Destino:</span>
                <span>{editing.uf ?? "—"}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              submitGuard.current ||
              (mode === "vendas" ? !form.vendedor_id : mode === "logistica" ? !form.tipo_caminhao || !form.placa || !form.motorista : !form.vendedor_id)
            }
          >
            {isSubmitting
              ? "Salvando…"
              : mode === "vendas" ? "Criar Pedido" : mode === "logistica" ? "Completar" : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
