import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATUSES, UF_LIST } from "@/lib/constants";
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
}

const emptyItem = (): ProductItem => ({
  codigo_produto: "",
  nome_produto: "",
  quantidade: 1,
  peso: 0,
  pesoPadrao: 0,
  ruptura: false,
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

export function CarregamentoDialog({ open, onOpenChange, onSubmit, editing, mode, vendedores, tiposCaminhao, produtos, clientes, selectedDate, defaultRuptura }: Props) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [codigoVendedorInput, setCodigoVendedorInput] = useState("");
  const [codigoClienteInput, setCodigoClienteInput] = useState("");
  const [items, setItems] = useState<ProductItem[]>([emptyItem()]);

  useEffect(() => {
    if (editing) {
      setForm({ ...editing });
      const v = vendedores.find(v => v.id === editing.vendedor_id);
      setCodigoVendedorInput(v?.codigo_vendedor ?? "");
      setCodigoClienteInput(editing.codigo_cliente ?? "");
      const p = produtos.find(p => p.codigo_produto === editing.codigo_produto);
      setItems([{
        codigo_produto: editing.codigo_produto ?? "",
        nome_produto: editing.nome_produto ?? "",
        quantidade: editing.quantidade ?? 1,
        peso: editing.peso ?? 0,
        pesoPadrao: p?.peso_padrao ?? 0,
        ruptura: editing.ruptura ?? false,
      }]);
    } else {
      setForm({ data: selectedDate, status: "Aguardando", etapa: "vendas", ruptura: defaultRuptura ?? false });
      setCodigoVendedorInput("");
      setCodigoClienteInput("");
      setItems([emptyItem()]);
    }
  }, [editing, open, selectedDate]);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleCodigoVendedor = (codigo: string) => {
    const found = vendedores.find((v) => v.codigo_vendedor === codigo);
    if (found) {
      set("vendedor_id", found.id);
    }
  };

  // On-demand client lookup by code — avoids loading 5000+ clients
  const { data: lookedUpCliente } = useQuery({
    queryKey: ["cliente-lookup", codigoClienteInput],
    enabled: codigoClienteInput.length >= 1,
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes")
        .select("codigo_cliente, nome_cliente, cidade, uf")
        .eq("codigo_cliente", codigoClienteInput.trim())
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
      updateItem(index, {
        codigo_produto: codigo,
        nome_produto: found.nome_produto,
        pesoPadrao: pp,
        peso: pp * (item.quantidade ?? 1),
      });
    } else {
      updateItem(index, { codigo_produto: codigo, nome_produto: "", pesoPadrao: 0, peso: 0 });
    }
  };

  const handleItemQuantidade = (index: number, qty: number) => {
    const item = items[index];
    updateItem(index, { quantidade: qty, peso: item.pesoPadrao * qty });
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    const basePayload: Record<string, any> = { ...form };
    delete basePayload.id;
    delete basePayload.vendedores;
    delete basePayload.codigo_produto;
    delete basePayload.nome_produto;
    delete basePayload.quantidade;
    delete basePayload.peso;

    if (mode === "logistica") {
      basePayload.etapa = "logistica";
    }

    if (editing) {
      items.forEach((item, index) => {
        onSubmit({
          ...basePayload,
          ...(index === 0 ? { id: editing.id } : {}),
          codigo_produto: item.codigo_produto,
          nome_produto: item.nome_produto,
          quantidade: item.quantidade,
          peso: item.peso,
          ruptura: item.ruptura,
        });
      });
    } else {
      // Batch create: send all items in a single request
      const batchRows = items.map(item => ({
        ...basePayload,
        codigo_produto: item.codigo_produto,
        nome_produto: item.nome_produto,
        quantidade: item.quantidade,
        peso: item.peso,
        ruptura: item.ruptura,
      }));
      if (batchRows.length === 1) {
        onSubmit(batchRows[0]);
      } else {
        onSubmit({ _batch: batchRows });
      }
    }
    // Close after a brief delay to allow mutations to fire
    setTimeout(() => onOpenChange(false), 150);
  };

  const showVendas = mode === "vendas" || mode === "editar";
  const showLogistica = mode === "logistica" || mode === "editar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  <div key={idx} className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_1.5fr_80px_100px_auto_32px] sm:gap-2 sm:items-end border-b border-border pb-3 sm:border-0 sm:pb-0">
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
                        <Label className="text-xs sm:hidden">Qtd</Label>
                        {idx === 0 && <Label className="text-xs hidden sm:block">Qtd</Label>}
                        <Input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => handleItemQuantidade(idx, Number(e.target.value))}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs sm:hidden">Peso (kg)</Label>
                        {idx === 0 && <Label className="text-xs hidden sm:block">Peso (kg)</Label>}
                        <Input
                          type="number"
                          value={item.peso}
                          onChange={(e) => updateItem(idx, { peso: Number(e.target.value) })}
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
                <Label className="text-xs">Placa *</Label>
                <Input value={form.placa ?? ""} onChange={(e) => set("placa", e.target.value.toUpperCase())} placeholder="ABC1D23" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Motorista *</Label>
                <Input value={form.motorista ?? ""} onChange={(e) => set("motorista", e.target.value)} />
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={mode === "vendas" ? !form.vendedor_id : mode === "logistica" ? !form.tipo_caminhao || !form.placa || !form.motorista : !form.vendedor_id}
          >
            {mode === "vendas" ? "Criar Pedido" : mode === "logistica" ? "Completar" : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
