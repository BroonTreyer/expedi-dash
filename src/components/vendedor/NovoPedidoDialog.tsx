import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, X, UserPlus, Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProdutos } from "@/hooks/useProdutos";
import { isPorUnidade, FORMAS_PAGAMENTO } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NovoClienteInline } from "./NovoClienteInline";

interface ItemRow {
  codigo_produto: string;
  nome_produto: string;
  quantidade: number;
  peso: number;
  pesoPadrao: number;
  pesoManual: boolean;
  precoUnitario: number;
}

const emptyItem = (): ItemRow => ({
  codigo_produto: "", nome_produto: "", quantidade: 1, peso: 0, pesoPadrao: 0, pesoManual: true, precoUnitario: 0,
});

export interface NovoPedidoSubmit {
  cliente: { codigo_cliente: string; nome_cliente: string; cidade: string | null; uf: string | null };
  items: Array<{ codigo_produto: string; nome_produto: string; quantidade: number; peso: number; preco_unitario: number; preco_total: number }>;
  observacoes: string;
  forma_pagamento: string;
  enviarParaAprovacao: boolean;
  editingId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (data: NovoPedidoSubmit) => Promise<void> | void;
  isSubmitting?: boolean;
  editing?: {
    id: string;
    codigo_cliente: string | null;
    cliente: string | null;
    cidade: string | null;
    uf: string | null;
    codigo_produto: string | null;
    nome_produto: string | null;
    quantidade: number | null;
    peso: number | null;
    preco_unitario?: number | null;
    observacoes: string | null;
    forma_pagamento?: string | null;
  } | null;
}

export function NovoPedidoDialog({ open, onOpenChange, onSubmit, isSubmitting, editing }: Props) {
  const session = useSession();
  const { data: produtosAll = [] } = useProdutos();

  const [codigoCliente, setCodigoCliente] = useState("");
  const [debouncedCodigo, setDebouncedCodigo] = useState("");
  const [clienteSel, setClienteSel] = useState<{ codigo_cliente: string; nome_cliente: string; cidade: string | null; uf: string | null } | null>(null);
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [observacoes, setObservacoes] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<string>("");
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  // Trava reentrante contra duplo clique antes do React re-renderizar
  const submittingRefLocal = useRef(false);

  // Reset / hidrata editing
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCodigoCliente(editing.codigo_cliente ?? "");
      setClienteSel(editing.codigo_cliente ? {
        codigo_cliente: editing.codigo_cliente,
        nome_cliente: editing.cliente ?? "",
        cidade: editing.cidade,
        uf: editing.uf,
      } : null);
      setItems([{
        codigo_produto: editing.codigo_produto ?? "",
        nome_produto: editing.nome_produto ?? "",
        quantidade: Number(editing.quantidade ?? 1),
        peso: Number(editing.peso ?? 0),
        pesoPadrao: 0,
        pesoManual: true,
        precoUnitario: Number(editing.preco_unitario ?? 0),
      }]);
      setObservacoes(editing.observacoes ?? "");
      setFormaPagamento(editing.forma_pagamento ?? "");
    } else {
      setCodigoCliente("");
      setDebouncedCodigo("");
      setClienteSel(null);
      setItems([emptyItem()]);
      setObservacoes("");
      setFormaPagamento("");
    }
  }, [open, editing]);

  // Debounce do código (300ms) — busca sob demanda em base de 32k+ clientes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const code = codigoCliente.trim();
    if (!code) { setDebouncedCodigo(""); setClienteSel(null); return; }
    // Se já está selecionado e bate com digitado, não precisa buscar de novo
    if (clienteSel && clienteSel.codigo_cliente === code) { setDebouncedCodigo(code); return; }
    debounceRef.current = setTimeout(() => setDebouncedCodigo(code), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [codigoCliente]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: clienteLookup, isFetching: lookingUp } = useQuery({
    queryKey: ["cliente-lookup", debouncedCodigo],
    enabled: !!session && debouncedCodigo.length >= 1 && (!clienteSel || clienteSel.codigo_cliente !== debouncedCodigo),
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes")
        .select("codigo_cliente, nome_cliente, cidade, uf")
        .eq("codigo_cliente", debouncedCodigo)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (clienteLookup) {
      setClienteSel({
        codigo_cliente: clienteLookup.codigo_cliente,
        nome_cliente: clienteLookup.nome_cliente,
        cidade: clienteLookup.cidade ?? null,
        uf: clienteLookup.uf ?? null,
      });
    }
  }, [clienteLookup]);

  const naoEncontrado = !!debouncedCodigo && !lookingUp && !clienteLookup && (!clienteSel || clienteSel.codigo_cliente !== debouncedCodigo);

  const updateItem = (i: number, patch: Partial<ItemRow>) => {
    setItems((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  const handleProdutoChange = (i: number, codigo: string) => {
    const p = produtosAll.find((x: any) => x.codigo_produto === codigo);
    if (!p) return;
    const pesoPadrao = Number(p.peso_padrao ?? 0);
    const qtd = items[i].quantidade || 1;
    updateItem(i, {
      codigo_produto: p.codigo_produto,
      nome_produto: p.nome_produto,
      pesoPadrao,
      peso: pesoPadrao * qtd,
      pesoManual: false,
    });
  };

  const handleQtdChange = (i: number, qtd: number) => {
    const it = items[i];
    const novoPeso = it.pesoManual ? it.peso : (it.pesoPadrao || 0) * qtd;
    updateItem(i, { quantidade: qtd, peso: novoPeso });
  };

  const handlePesoChange = (i: number, peso: number) => {
    const it = items[i];
    if (it.pesoPadrao && it.pesoPadrao > 0) {
      const novaQtd = Math.max(1, Math.round(peso / it.pesoPadrao));
      const esperado = it.pesoPadrao * novaQtd;
      const manual = Math.abs(peso - esperado) > 0.001;
      updateItem(i, { peso, quantidade: novaQtd, pesoManual: manual });
    } else {
      updateItem(i, { peso, pesoManual: true });
    }
  };

  const isValid = useMemo(() => {
    if (!clienteSel) return false;
    if (!formaPagamento) return false;
    return items.every((r) => r.codigo_produto && r.quantidade > 0);
  }, [clienteSel, items, formaPagamento]);

  const submit = async (enviar: boolean) => {
    if (!clienteSel || !isValid) return;
    if (submittingRefLocal.current) return;
    submittingRefLocal.current = true;
    try {
      await onSubmit({
      cliente: clienteSel,
      items: items.map((r) => ({
        codigo_produto: r.codigo_produto,
        nome_produto: r.nome_produto,
        quantidade: r.quantidade,
        peso: r.peso,
        preco_unitario: r.precoUnitario || 0,
        preco_total: (r.precoUnitario || 0) * (r.quantidade || 0),
      })),
      observacoes: observacoes.trim(),
      forma_pagamento: formaPagamento,
      enviarParaAprovacao: enviar,
      editingId: editing?.id,
      });
    } finally {
      submittingRefLocal.current = false;
    }
  };

  const totalPedido = items.reduce((s, r) => s + (r.precoUnitario || 0) * (r.quantidade || 0), 0);
  const semPreco = items.some((r) => !r.precoUnitario);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{editing ? "Editar rascunho" : "Novo Pedido"}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Lance os itens. Salve como rascunho ou envie para o faturamento.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cliente */}
            <section className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</Label>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setNovoClienteOpen(true)}>
                  <UserPlus className="h-3.5 w-3.5" /> Novo
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Código *</Label>
                  <Input
                    inputMode="numeric"
                    value={codigoCliente}
                    onChange={(e) => setCodigoCliente(e.target.value)}
                    placeholder="Ex: 33011"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <Label className="text-xs">Nome</Label>
                  <div className="relative">
                    <Input
                      value={clienteSel?.nome_cliente ?? ""}
                      readOnly
                      placeholder={lookingUp ? "Buscando cliente..." : "Digite o código para buscar"}
                      className="h-10 bg-background pr-9 truncate"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 opacity-50" />}
                    </span>
                  </div>
                  {clienteSel && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[clienteSel.cidade, clienteSel.uf].filter(Boolean).join(" – ") || "Sem cidade cadastrada"}
                    </p>
                  )}
                  {naoEncontrado && (
                    <p className="text-[11px] text-amber-700">Cliente não encontrado. Use "Novo" para cadastrar.</p>
                  )}
                </div>
              </div>
            </section>

            {/* Itens */}
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Itens do pedido *</Label>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setItems([...items, emptyItem()])}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((r, i) => {
                  const porUnidade = r.codigo_produto ? isPorUnidade(r.codigo_produto, r.nome_produto) : false;
                  const totalLinha = (r.precoUnitario || 0) * (r.quantidade || 0);
                  return (
                    <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Produto</Label>
                          <ProdutoCombobox
                            produtos={produtosAll.filter((p: any) => p.ativo)}
                            value={r.codigo_produto}
                            label={r.codigo_produto ? `${r.codigo_produto} – ${r.nome_produto}` : ""}
                            onSelect={(codigo) => handleProdutoChange(i, codigo)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={items.length === 1}
                          onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                          aria-label="Remover item"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Peso (kg)</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={r.peso || ""}
                            onChange={(e) => handlePesoChange(i, Number(e.target.value))}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{porUnidade ? "Unidades" : "Qtd"}</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="1"
                            value={r.quantidade || ""}
                            onChange={(e) => handleQtdChange(i, Number(e.target.value))}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                          <Label className="text-[11px] text-muted-foreground">Preço unit. (R$)</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={r.precoUnitario || ""}
                            placeholder="0,00"
                            onChange={(e) => updateItem(i, { precoUnitario: Number(e.target.value) })}
                            className="h-10"
                          />
                        </div>
                      </div>
                      {totalLinha > 0 && (
                        <p className="text-[11px] text-muted-foreground tabular-nums text-right">
                          Subtotal: <span className="font-semibold text-foreground">{totalLinha.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Observações */}
            <section className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                placeholder="Algo que o faturamento precise saber"
                className="resize-none"
              />
            </section>

            {/* Total */}
            <section className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <div className="text-xs text-muted-foreground">
                Total do pedido
                {semPreco && <span className="ml-1.5 text-amber-700">· itens sem preço</span>}
              </div>
              <div className="text-base sm:text-lg font-semibold tabular-nums">
                {totalPedido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
            </section>

            {/* Ações */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button variant="outline" disabled={!isValid || isSubmitting} onClick={() => submit(false)} className="w-full sm:w-auto">
                Salvar rascunho
              </Button>
              <Button disabled={!isValid || isSubmitting} onClick={() => submit(true)} className="w-full sm:w-auto">
                {isSubmitting ? "Enviando..." : "Enviar para faturamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <NovoClienteInline
        open={novoClienteOpen}
        onOpenChange={setNovoClienteOpen}
        defaultCodigo={codigoCliente}
        onCreated={(c) => {
          setCodigoCliente(c.codigo_cliente);
          setClienteSel({
            codigo_cliente: c.codigo_cliente,
            nome_cliente: c.nome_cliente,
            cidade: c.cidade ?? null,
            uf: c.uf ?? null,
          });
        }}
      />
    </>
  );
}

/* -------- Combobox de produto com busca por código ou nome -------- */
function ProdutoCombobox({
  produtos,
  value,
  label,
  onSelect,
}: {
  produtos: any[];
  value: string;
  label: string;
  onSelect: (codigo: string) => void;
}) {
  const [openPop, setOpenPop] = useState(false);
  return (
    <Popover open={openPop} onOpenChange={setOpenPop}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn("w-full h-10 justify-between font-normal", !value && "text-muted-foreground")}
        >
          <span className="truncate text-left">{label || "Selecione ou digite"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[min(92vw,420px)]"
        align="start"
      >
        <Command
          filter={(itemValue, search) => {
            const s = search.toLowerCase();
            return itemValue.toLowerCase().includes(s) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar por código ou nome…" />
          <CommandList className="max-h-[40vh]">
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            <CommandGroup>
              {produtos.map((p) => {
                const searchable = `${p.codigo_produto} ${p.nome_produto}`;
                return (
                  <CommandItem
                    key={p.codigo_produto}
                    value={searchable}
                    onSelect={() => {
                      onSelect(p.codigo_produto);
                      setOpenPop(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === p.codigo_produto ? "opacity-100" : "opacity-0")} />
                    <span className="font-mono text-xs text-muted-foreground mr-2">{p.codigo_produto}</span>
                    <span className="truncate">{p.nome_produto}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
