import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Check, ChevronsUpDown, CheckCircle2, Save, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProdutos } from "@/hooks/useProdutos";
import { isPorUnidade, FORMAS_PAGAMENTO } from "@/lib/constants";
import { useEditarPedidoAprovacao, type EditItemPayload } from "@/hooks/useEditarPedidoAprovacao";

interface RowState extends EditItemPayload {
  _key: string;
  pesoPadrao: number;
  pesoManual: boolean;
  ruptura: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  grupo: any[] | null; // pedidos do grupo (mesmo numero_pedido + cliente + vendedor + data)
  /**
   * Quando definido, o dialog opera em modo "pré-carga":
   * - novos itens nascem em etapa = 'pre_carga' herdando dados de transporte
   * - o botão "Salvar e aprovar" some (o pedido continua na pré-carga)
   */
  preCargaContext?: {
    carga_id: string;
    nome_carga: string | null;
    placa: string | null;
    motorista: string | null;
    transportadora: string | null;
    tipo_caminhao: string | null;
    ordem_carga: string | null;
    /** Etapa para novos itens. Default "pre_carga". Usado pelo Consolidado para herdar a etapa atual da carga. */
    etapaAlvo?: string | null;
  } | null;
}

export function EditarPedidoAprovacaoDialog({ open, onOpenChange, grupo, preCargaContext }: Props) {
  const { data: produtosAll = [] } = useProdutos();
  const editar = useEditarPedidoAprovacao();

  const [items, setItems] = useState<RowState[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<string>("");
  // Trava reentrante contra duplo clique antes do React re-renderizar
  const submittingRef = useRef(false);

  const head = grupo?.[0];

  useEffect(() => {
    if (!open || !grupo) return;
    setItems(
      grupo.map((r, idx) => {
        const p = produtosAll.find((x: any) => x.codigo_produto === r.codigo_produto);
        return {
          _key: r.id ?? `k-${idx}`,
          id: r.id,
          codigo_produto: r.codigo_produto ?? "",
          nome_produto: r.nome_produto ?? "",
          quantidade: Number(r.quantidade ?? 1),
          peso: Number(r.peso ?? 0),
          preco_unitario: Number(r.preco_unitario ?? 0),
          preco_total: Number(r.preco_total ?? 0),
          motivo_ruptura: null,
          pesoPadrao: Number(p?.peso_padrao ?? 0),
          pesoManual: !!r.peso_manual,
          ruptura: !!r.ruptura,
        };
      })
    );
    setRemovedIds([]);
    setObservacoes(grupo[0]?.observacoes ?? "");
    setFormaPagamento(grupo[0]?.forma_pagamento ?? "");
  }, [open, grupo, produtosAll]);

  const update = (i: number, patch: Partial<RowState>) => {
    setItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const handleProduto = (i: number, codigo: string) => {
    const p = produtosAll.find((x: any) => x.codigo_produto === codigo);
    if (!p) return;
    const pesoPadrao = Number(p.peso_padrao ?? 0);
    const qtd = items[i].quantidade || 1;
    update(i, {
      codigo_produto: p.codigo_produto,
      nome_produto: p.nome_produto,
      pesoPadrao,
      peso: pesoPadrao * qtd,
      pesoManual: false,
    });
  };

  const handleQtd = (i: number, qtd: number) => {
    const it = items[i];
    const novoPeso = it.pesoManual ? it.peso : (it.pesoPadrao || 0) * qtd;
    const novoTotal = (it.preco_unitario || 0) * qtd;
    update(i, { quantidade: qtd, peso: novoPeso, preco_total: novoTotal });
  };

  const handlePeso = (i: number, peso: number) => {
    const it = items[i];
    if (it.pesoPadrao && it.pesoPadrao > 0) {
      const novaQtd = Math.max(1, Math.round(peso / it.pesoPadrao));
      const esperado = it.pesoPadrao * novaQtd;
      const manual = Math.abs(peso - esperado) > 0.001;
      update(i, {
        peso,
        quantidade: novaQtd,
        pesoManual: manual,
        preco_total: (it.preco_unitario || 0) * novaQtd,
      });
    } else {
      update(i, { peso, pesoManual: true });
    }
  };

  const handlePreco = (i: number, preco: number) => {
    const it = items[i];
    update(i, { preco_unitario: preco, preco_total: preco * (it.quantidade || 0) });
  };

  const removerItem = (i: number) => {
    const it = items[i];
    if (it.id) setRemovedIds((p) => [...p, it.id!]);
    setItems((p) => p.filter((_, idx) => idx !== i));
  };

  const adicionarItem = () => {
    setItems((p) => [
      ...p,
      {
        _key: `new-${Date.now()}-${p.length}`,
        codigo_produto: "",
        nome_produto: "",
        quantidade: 1,
        peso: 0,
        preco_unitario: 0,
        preco_total: 0,
        motivo_ruptura: null,
        pesoPadrao: 0,
        pesoManual: true,
        ruptura: false,
      },
    ]);
  };

  const isValid = useMemo(
    () =>
      items.length > 0 &&
      (preCargaContext ? true : !!formaPagamento) &&
      items.every((r) => r.codigo_produto && r.quantidade > 0),
    [items, formaPagamento, preCargaContext]
  );

  const totalPedido = items.reduce((s, r) => s + (r.preco_unitario || 0) * (r.quantidade || 0), 0);
  const totalPeso = items.reduce((s, r) => s + (r.peso || 0), 0);

  const salvar = async (aprovar: boolean) => {
    if (!head || !isValid) return;
    if (submittingRef.current || editar.isPending) return;
    submittingRef.current = true;
    try {
      await editar.mutateAsync({
      vendedor_id: head.vendedor_id,
      data: head.data,
      numero_pedido: head.numero_pedido,
      codigo_cliente: head.codigo_cliente,
      cliente: head.cliente,
      cidade: head.cidade,
      uf: head.uf,
      observacoes: observacoes.trim(),
      forma_pagamento: formaPagamento || null,
      items: items.map((r) => ({
        id: r.id,
        codigo_produto: r.codigo_produto,
        nome_produto: r.nome_produto,
        quantidade: r.quantidade,
        peso: r.peso,
        preco_unitario: r.preco_unitario || 0,
        preco_total: (r.preco_unitario || 0) * (r.quantidade || 0),
        motivo_ruptura: r.motivo_ruptura,
        ruptura: r.ruptura,
      })),
      removedIds,
      aprovarAposSalvar: preCargaContext ? false : aprovar,
      preCargaContext: preCargaContext ?? null,
      });
      onOpenChange(false);
    } finally {
      submittingRef.current = false;
    }
  };

  if (!head) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {preCargaContext ? (preCargaContext.etapaAlvo && preCargaContext.etapaAlvo !== "pre_carga" ? "Editar pedido na carga" : "Editar pedido na pré-carga") : "Editar pedido em aprovação"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {preCargaContext
              ? "Ajuste produtos, peso, quantidade ou preços. O pedido continua dentro desta carga."
              : "Ajuste produtos, peso, quantidade ou preços. Para trocar o cliente, devolva ao vendedor."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cabeçalho cliente (read-only) */}
          <section className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <div className="text-sm font-semibold truncate">{head.cliente ?? "Sem cliente"}</div>
              <div className="text-[11px] text-muted-foreground">
                Pedido #{head.numero_pedido} · Vendedor {head.vendedores?.nome_vendedor ?? "—"}
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {head.codigo_cliente ? `Cód. ${head.codigo_cliente}` : "Sem código"}
              {head.cidade ? ` · ${head.cidade}/${head.uf ?? ""}` : ""}
            </div>
          </section>

          {/* Forma de pagamento (oculta em pré-carga) */}
          {!preCargaContext && (
          <section className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Forma de pagamento <span className="text-destructive">*</span>
            </Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {FORMAS_PAGAMENTO.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
          )}

          {/* Itens */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Itens ({items.length})
              </Label>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={adicionarItem}>
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((r, i) => {
                const porUnidade = r.codigo_produto ? isPorUnidade(r.codigo_produto, r.nome_produto) : false;
                const subtotal = (r.preco_unitario || 0) * (r.quantidade || 0);
                return (
                  <div key={r._key} className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Produto</Label>
                        <ProdutoCombobox
                          produtos={produtosAll.filter((p: any) => p.ativo)}
                          value={r.codigo_produto}
                          label={r.codigo_produto ? `${r.codigo_produto} – ${r.nome_produto}` : ""}
                          onSelect={(codigo) => handleProduto(i, codigo)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removerItem(i)}
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
                          onChange={(e) => handlePeso(i, Number(e.target.value))}
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
                          onChange={(e) => handleQtd(i, Number(e.target.value))}
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
                          value={r.preco_unitario || ""}
                          placeholder="0,00"
                          onChange={(e) => handlePreco(i, Number(e.target.value))}
                          className="h-10"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted/20 px-2 py-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`ruptura-${r._key}`}
                          checked={r.ruptura}
                          onCheckedChange={(checked) =>
                            update(i, {
                              ruptura: checked,
                              motivo_ruptura: null,
                            })
                          }
                        />
                        <Label htmlFor={`ruptura-${r._key}`} className="text-xs font-medium flex items-center gap-1 cursor-pointer">
                          <AlertTriangle className={cn("h-3.5 w-3.5", r.ruptura ? "text-destructive" : "text-muted-foreground")} />
                          Ruptura
                        </Label>
                      </div>
                    </div>
                    {subtotal > 0 && (
                      <p className="text-[11px] text-muted-foreground tabular-nums text-right">
                        Subtotal:{" "}
                        <span className="font-semibold text-foreground">
                          {subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
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
              placeholder="Anotação que ficará no pedido"
              className="resize-none"
            />
          </section>

          {/* Total */}
          <section className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <div className="text-xs text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{totalPeso.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</span>
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
            <Button
              variant="outline"
              disabled={!isValid || editar.isPending}
              onClick={() => salvar(false)}
              className="w-full sm:w-auto gap-1"
            >
              <Save className="h-4 w-4" /> Salvar
            </Button>
            {!preCargaContext && (
            <Button
              disabled={!isValid || editar.isPending}
              onClick={() => salvar(true)}
              className="w-full sm:w-auto gap-1"
            >
              <CheckCircle2 className="h-4 w-4" />
              {editar.isPending ? "Salvando..." : "Salvar e aprovar"}
            </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
          aria-expanded={openPop}
          className="w-full h-10 justify-between font-normal"
        >
          <span className={cn("truncate text-left", !label && "text-muted-foreground")}>
            {label || "Selecione o produto..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            const s = search.toLowerCase();
            return itemValue.toLowerCase().includes(s) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar por código ou nome..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            <CommandGroup>
              {produtos.map((p: any) => (
                <CommandItem
                  key={p.codigo_produto}
                  value={`${p.codigo_produto} ${p.nome_produto}`}
                  onSelect={() => {
                    onSelect(p.codigo_produto);
                    setOpenPop(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.codigo_produto ? "opacity-100" : "opacity-0")} />
                  <span className="font-mono text-xs text-muted-foreground mr-2">{p.codigo_produto}</span>
                  <span className="truncate">{p.nome_produto}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}