import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, UserPlus } from "lucide-react";
import { useClientes } from "@/hooks/useClientes";
import { useProdutos } from "@/hooks/useProdutos";
import { isPorUnidade } from "@/lib/constants";
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
  enviarParaAprovacao: boolean;
  editingId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (data: NovoPedidoSubmit) => Promise<void> | void;
  isSubmitting?: boolean;
  /** Pedido em rascunho a ser editado (somente uma linha — itens irmãos serão tratados pelo caller). */
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
  } | null;
}

export function NovoPedidoDialog({ open, onOpenChange, onSubmit, isSubmitting, editing }: Props) {
  const { data: clientesAll = [] } = useClientes();
  const { data: produtosAll = [] } = useProdutos();

  const [codigoCliente, setCodigoCliente] = useState("");
  const [clienteSel, setClienteSel] = useState<{ codigo_cliente: string; nome_cliente: string; cidade: string | null; uf: string | null } | null>(null);
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [observacoes, setObservacoes] = useState("");
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);

  // Reset quando abrir/fechar ou trocar editing
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
    } else {
      setCodigoCliente("");
      setClienteSel(null);
      setItems([emptyItem()]);
      setObservacoes("");
    }
  }, [open, editing]);

  // Lookup cliente por código (igual UX do CarregamentoDialog)
  useEffect(() => {
    const code = codigoCliente.trim();
    if (!code) { setClienteSel(null); return; }
    const found = clientesAll.find((c: any) => c.codigo_cliente === code);
    if (found) {
      setClienteSel({
        codigo_cliente: found.codigo_cliente,
        nome_cliente: found.nome_cliente,
        cidade: found.cidade ?? null,
        uf: found.uf ?? null,
      });
    }
  }, [codigoCliente, clientesAll]);

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
    updateItem(i, { peso, pesoManual: true });
  };

  const isValid = useMemo(() => {
    if (!clienteSel) return false;
    return items.every((r) => r.codigo_produto && r.quantidade > 0);
  }, [clienteSel, items]);

  const submit = async (enviar: boolean) => {
    if (!clienteSel || !isValid) return;
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
      enviarParaAprovacao: enviar,
      editingId: editing?.id,
    });
  };

  const totalPedido = items.reduce((s, r) => s + (r.precoUnitario || 0) * (r.quantidade || 0), 0);
  const semPreco = items.some((r) => !r.precoUnitario);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar rascunho" : "Novo Pedido"}</DialogTitle>
            <DialogDescription>Lance os itens do pedido. Você pode salvar como rascunho e enviar depois.</DialogDescription>
          </DialogHeader>

          {/* Cliente */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2 items-end">
              <div>
                <Label>Código cliente *</Label>
                <Input value={codigoCliente} onChange={(e) => setCodigoCliente(e.target.value)} placeholder="12345" />
              </div>
              <div>
                <Label>Cliente</Label>
                <Input value={clienteSel?.nome_cliente ?? ""} readOnly placeholder="Preencha o código" className="bg-muted/40" />
                {clienteSel && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {[clienteSel.cidade, clienteSel.uf].filter(Boolean).join(" – ")}
                  </p>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setNovoClienteOpen(true)}>
                <UserPlus className="h-4 w-4" /> Novo
              </Button>
            </div>

            {/* Itens */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Itens do pedido *</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setItems([...items, emptyItem()])}>
                  <Plus className="h-4 w-4" /> Adicionar item
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((r, i) => {
                  const porUnidade = r.codigo_produto ? isPorUnidade(r.codigo_produto, r.nome_produto) : false;
                  const totalLinha = (r.precoUnitario || 0) * (r.quantidade || 0);
                  return (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_90px_90px_110px_auto] gap-2 items-end p-2 rounded-md bg-muted/30 border">
                      <div>
                        <Label className="text-xs">Produto</Label>
                        <Select value={r.codigo_produto} onValueChange={(v) => handleProdutoChange(i, v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {produtosAll.filter((p: any) => p.ativo).map((p: any) => (
                              <SelectItem key={p.codigo_produto} value={p.codigo_produto}>
                                {p.codigo_produto} – {p.nome_produto}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Peso (kg)</Label>
                        <Input type="number" step="0.01" min="0" value={r.peso} onChange={(e) => handlePesoChange(i, Number(e.target.value))} />
                      </div>
                      <div>
                        <Label className="text-xs">{porUnidade ? "Unidades" : "Qtd"}</Label>
                        <Input type="number" step="1" min="1" value={r.quantidade} onChange={(e) => handleQtdChange(i, Number(e.target.value))} />
                      </div>
                      <div>
                        <Label className="text-xs">Preço unit. (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={r.precoUnitario || ""}
                          placeholder="0,00"
                          onChange={(e) => updateItem(i, { precoUnitario: Number(e.target.value) })}
                        />
                        {totalLinha > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                            = {totalLinha.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                        )}
                      </div>
                      <Button type="button" variant="ghost" size="icon" disabled={items.length === 1} onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} placeholder="Algo que o faturamento precise saber" />
            </div>

            <div className="flex items-center justify-between rounded-md bg-muted/40 border px-3 py-2">
              <div className="text-xs text-muted-foreground">
                Total do pedido
                {semPreco && <span className="ml-2 text-amber-700">· alguns itens sem preço</span>}
              </div>
              <div className="text-base font-semibold tabular-nums">
                {totalPedido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="outline" disabled={!isValid || isSubmitting} onClick={() => submit(false)}>
              Salvar rascunho
            </Button>
            <Button disabled={!isValid || isSubmitting} onClick={() => submit(true)}>
              {isSubmitting ? "Enviando..." : "Enviar para faturamento"}
            </Button>
          </DialogFooter>
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