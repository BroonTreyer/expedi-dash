import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, Trash2, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isPorUnidade } from "@/lib/constants";

type Vendedor = { id: string; codigo_vendedor: string; nome_vendedor: string };
type Produto = { codigo_produto: string; nome_produto: string; peso_padrao: number | null };
type Cliente = { codigo_cliente: string; nome_cliente: string; cidade?: string | null; uf?: string | null };

type ParsedItem = {
  codigo_produto: string;
  nome_produto: string;
  quantidade: number;
  unidade?: string;
};
type ParsedPedido = {
  numero_pedido: string;
  nr_unico?: string;
  emissao?: string;
  cliente: { codigo: string; nome: string; cidade?: string; uf?: string };
  vendedor: { codigo: string; nome: string };
  itens: ParsedItem[];
};

type Item = {
  codigo_produto: string;
  nome_produto: string;
  quantidade: number;
  peso: number;
  pesoPadrao: number;
  pesoManual: boolean;
  ruptura: boolean;
  motivo_ruptura: string;
  produtoCadastrado: boolean;
};

type Pedido = {
  fileId: string;
  fileName: string;
  status: "loading" | "ok" | "error";
  error?: string;
  numero_pedido: number | null;
  nr_unico?: string;
  cliente_codigo: string;
  cliente_nome: string;
  cidade: string;
  uf: string;
  vendedor_id: string | null;
  vendedor_codigo: string;
  vendedor_nome: string;
  clienteCadastrado: boolean;
  vendedorCadastrado: boolean;
  jaImportado: boolean;
  items: Item[];
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  produtos: Produto[];
  vendedores: Vendedor[];
  clientes: Cliente[];
  existingNumeros: Set<number>;
  onConfirm: (rows: Record<string, any>[]) => Promise<void> | void;
  isSubmitting?: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ImportarPedidoPdfDialog({ open, onOpenChange, selectedDate, produtos, vendedores, clientes, existingNumeros, onConfirm, isSubmitting }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lookup maps
  const produtoByCod = useMemo(() => {
    const m = new Map<string, Produto>();
    for (const p of produtos) m.set(p.codigo_produto.toLowerCase(), p);
    return m;
  }, [produtos]);
  const clienteByCod = useMemo(() => {
    const m = new Map<string, Cliente>();
    for (const c of clientes) m.set(c.codigo_cliente.toLowerCase(), c);
    return m;
  }, [clientes]);
  const vendedorByCod = useMemo(() => {
    const m = new Map<string, Vendedor>();
    for (const v of vendedores) m.set(v.codigo_vendedor.toLowerCase(), v);
    return m;
  }, [vendedores]);

  useEffect(() => {
    if (!open) {
      setPedidos([]);
      setIsParsing(false);
    }
  }, [open]);

  const parsedToPedido = useCallback((fileId: string, fileName: string, parsed: ParsedPedido): Pedido => {
    const clienteHit = clienteByCod.get((parsed.cliente?.codigo ?? "").toLowerCase());
    const vendedorHit = vendedorByCod.get((parsed.vendedor?.codigo ?? "").toLowerCase());
    const numero = parsed.numero_pedido ? parseInt(parsed.numero_pedido.replace(/\D/g, ""), 10) : NaN;
    const numeroPedido = Number.isFinite(numero) ? numero : null;

    const items: Item[] = (parsed.itens ?? []).map((it) => {
      const prodHit = produtoByCod.get((it.codigo_produto ?? "").toLowerCase());
      const pesoPadrao = Number(prodHit?.peso_padrao ?? 0);
      const qtd = Number(it.quantidade) || 0;
      // A coluna "Qtde" do PDF do Sankhya é sempre quantidade de embalagens.
      // Peso físico = peso_padrao × qtd (vale para KG e por unidade).
      // Sem peso_padrao (produto não cadastrado): fallback peso = qtd.
      const peso = pesoPadrao > 0 ? qtd * pesoPadrao : qtd;
      return {
        codigo_produto: it.codigo_produto ?? "",
        nome_produto: prodHit?.nome_produto ?? it.nome_produto ?? "",
        quantidade: qtd,
        peso,
        pesoPadrao,
        pesoManual: true,
        ruptura: false,
        motivo_ruptura: "",
        produtoCadastrado: !!prodHit,
      };
    });

    return {
      fileId,
      fileName,
      status: "ok",
      numero_pedido: numeroPedido,
      nr_unico: parsed.nr_unico,
      cliente_codigo: parsed.cliente?.codigo ?? "",
      cliente_nome: clienteHit?.nome_cliente ?? parsed.cliente?.nome ?? "",
      cidade: clienteHit?.cidade ?? parsed.cliente?.cidade ?? "",
      uf: clienteHit?.uf ?? parsed.cliente?.uf ?? "",
      vendedor_id: vendedorHit?.id ?? null,
      vendedor_codigo: parsed.vendedor?.codigo ?? "",
      vendedor_nome: vendedorHit?.nome_vendedor ?? parsed.vendedor?.nome ?? "",
      clienteCadastrado: !!clienteHit,
      vendedorCadastrado: !!vendedorHit,
      jaImportado: numeroPedido != null && existingNumeros.has(numeroPedido),
      items,
    };
  }, [produtoByCod, clienteByCod, vendedorByCod, existingNumeros]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (arr.length === 0) {
      toast.error("Selecione arquivos PDF.");
      return;
    }
    setIsParsing(true);

    const placeholders: Pedido[] = arr.map((f) => ({
      fileId: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fileName: f.name,
      status: "loading",
      numero_pedido: null,
      cliente_codigo: "",
      cliente_nome: "",
      cidade: "",
      uf: "",
      vendedor_id: null,
      vendedor_codigo: "",
      vendedor_nome: "",
      clienteCadastrado: false,
      vendedorCadastrado: false,
      jaImportado: false,
      items: [],
    }));
    setPedidos((prev) => [...prev, ...placeholders]);

    await Promise.allSettled(arr.map(async (file, idx) => {
      const placeholder = placeholders[idx];
      try {
        const fileBase64 = await fileToBase64(file);
        const { data, error } = await supabase.functions.invoke("parse-pedido-pdf", {
          body: { fileBase64, fileName: file.name },
        });
        if (error) throw error;
        const parsed = (data as any)?.data as ParsedPedido | undefined;
        if (!parsed) throw new Error("Resposta vazia da IA");
        const pedido = parsedToPedido(placeholder.fileId, file.name, parsed);
        setPedidos((prev) => prev.map((p) => (p.fileId === placeholder.fileId ? pedido : p)));
      } catch (e: any) {
        const msg = e?.message || "Falha ao ler PDF";
        setPedidos((prev) => prev.map((p) => (p.fileId === placeholder.fileId ? { ...p, status: "error", error: msg } : p)));
      }
    }));

    setIsParsing(false);
    if (inputRef.current) inputRef.current.value = "";
  }, [parsedToPedido]);

  const updatePedido = (fileId: string, patch: Partial<Pedido>) => {
    setPedidos((prev) => prev.map((p) => (p.fileId === fileId ? { ...p, ...patch } : p)));
  };
  const updateItem = (fileId: string, idx: number, patch: Partial<Item>) => {
    setPedidos((prev) => prev.map((p) => {
      if (p.fileId !== fileId) return p;
      return { ...p, items: p.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) };
    }));
  };
  const handleItemQuantidade = (fileId: string, idx: number, qty: number) => {
    setPedidos((prev) => prev.map((p) => {
      if (p.fileId !== fileId) return p;
      return {
        ...p,
        items: p.items.map((it, i) => {
          if (i !== idx) return it;
          const novoPeso = it.pesoPadrao > 0 ? qty * it.pesoPadrao : it.peso;
          return { ...it, quantidade: qty, peso: novoPeso };
        }),
      };
    }));
  };
  const handleItemPeso = (fileId: string, idx: number, peso: number) => {
    setPedidos((prev) => prev.map((p) => {
      if (p.fileId !== fileId) return p;
      return {
        ...p,
        items: p.items.map((it, i) => {
          if (i !== idx) return it;
          const unidade = isPorUnidade(it.nome_produto);
          if (unidade || !(it.pesoPadrao > 0)) {
            return { ...it, peso, pesoManual: true };
          }
          const novaQtd = Math.round(peso / it.pesoPadrao);
          return { ...it, peso, quantidade: novaQtd, pesoManual: true };
        }),
      };
    }));
  };
  const removeItem = (fileId: string, idx: number) => {
    setPedidos((prev) => prev.map((p) => {
      if (p.fileId !== fileId) return p;
      return { ...p, items: p.items.filter((_, i) => i !== idx) };
    }));
  };
  const removePedido = (fileId: string) => {
    setPedidos((prev) => prev.filter((p) => p.fileId !== fileId));
  };

  const okPedidos = pedidos.filter((p) => p.status === "ok" && !p.jaImportado);
  const totalItens = okPedidos.reduce((s, p) => s + p.items.length, 0);

  const handleConfirm = async () => {
    if (okPedidos.length === 0) return;
    const rows: Record<string, any>[] = [];
    for (const p of okPedidos) {
      if (p.items.length === 0) continue;
      for (const it of p.items) {
        if (!it.codigo_produto.trim()) continue;
        rows.push({
          data: selectedDate,
          status: "Aguardando",
          etapa: "vendas",
          numero_pedido: p.numero_pedido,
          codigo_cliente: p.cliente_codigo || null,
          cliente: p.cliente_nome || null,
          cidade: p.cidade || null,
          uf: p.uf || null,
          vendedor_id: p.vendedor_id,
          codigo_produto: it.codigo_produto,
          nome_produto: it.nome_produto,
          quantidade: it.quantidade,
          peso: it.ruptura ? 0 : it.peso,
          peso_manual: true,
          ruptura: it.ruptura,
          motivo_ruptura: it.ruptura ? (it.motivo_ruptura || null) : null,
        });
      }
    }
    if (rows.length === 0) {
      toast.error("Nenhum item válido para salvar.");
      return;
    }
    await onConfirm(rows);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>Importar pedidos por PDF</DialogTitle>
          <DialogDescription>
            Faça upload dos PDFs do Sankhya. Os dados serão extraídos automaticamente. Revise, marque rupturas se necessário e salve.
          </DialogDescription>
        </DialogHeader>

        {/* Upload zone */}
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/30">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">Arraste os PDFs aqui ou clique para selecionar</p>
          <p className="text-xs text-muted-foreground mb-3">Aceita múltiplos arquivos</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={isSubmitting}>
            <FileText className="h-4 w-4 mr-1" /> Selecionar PDFs
          </Button>
        </div>

        {/* Pedidos list */}
        {pedidos.length > 0 && (
          <div className="space-y-3 mt-2">
            {pedidos.map((p) => (
              <div key={p.fileId} className="border border-border rounded-lg p-3 sm:p-4 space-y-3 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground truncate">{p.fileName}</span>
                      {p.status === "loading" && (
                        <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Lendo PDF…</Badge>
                      )}
                      {p.status === "error" && (
                        <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {p.error}</Badge>
                      )}
                      {p.status === "ok" && p.jaImportado && (
                        <Badge className="bg-amber-500 text-white gap-1"><AlertTriangle className="h-3 w-3" /> Pedido já importado</Badge>
                      )}
                      {p.status === "ok" && !p.jaImportado && (
                        <Badge className="bg-emerald-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Pronto</Badge>
                      )}
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePedido(p.fileId)} title="Remover">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {p.status === "ok" && (
                  <>
                    {/* Header: numero, cliente, vendedor */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">N° Pedido</Label>
                        <Input
                          type="number"
                          value={p.numero_pedido ?? ""}
                          onChange={(e) => updatePedido(p.fileId, { numero_pedido: e.target.value ? Number(e.target.value) : null })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cód. Cliente</Label>
                        <Input
                          value={p.cliente_codigo}
                          onChange={(e) => updatePedido(p.fileId, { cliente_codigo: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Cliente</Label>
                        <Input
                          value={p.cliente_nome}
                          onChange={(e) => updatePedido(p.fileId, { cliente_nome: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cidade</Label>
                        <Input
                          value={p.cidade}
                          onChange={(e) => updatePedido(p.fileId, { cidade: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">UF</Label>
                        <Input
                          value={p.uf}
                          onChange={(e) => updatePedido(p.fileId, { uf: e.target.value.toUpperCase().slice(0, 2) })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Cód. Vendedor</Label>
                        <Input value={p.vendedor_codigo} readOnly className="h-8 text-sm bg-muted/50" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Vendedor</Label>
                        <Input
                          value={p.vendedor_nome}
                          readOnly
                          className="h-8 text-sm bg-muted/50"
                        />
                      </div>
                      <div className="col-span-3 flex flex-wrap items-end gap-1">
                        {!p.clienteCadastrado && (
                          <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">Cliente não cadastrado</Badge>
                        )}
                        {!p.vendedorCadastrado && (
                          <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">Vendedor não cadastrado</Badge>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="border-t border-border pt-2 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Itens ({p.items.length})
                      </div>
                      {p.items.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">Nenhum item.</p>
                      )}
                      {p.items.map((it, idx) => (
                        <div key={idx} className="grid grid-cols-2 sm:grid-cols-[80px_1fr_80px_90px_auto_28px] gap-2 items-end border-b border-border/50 pb-2 last:border-0">
                          <div className="space-y-1">
                            {idx === 0 && <Label className="text-xs hidden sm:block">Cód</Label>}
                            <Input
                              value={it.codigo_produto}
                              onChange={(e) => {
                                const cod = e.target.value;
                                const hit = produtoByCod.get(cod.toLowerCase());
                                const novoPesoPadrao = Number(hit?.peso_padrao ?? 0);
                                const novoPeso = novoPesoPadrao > 0 ? it.quantidade * novoPesoPadrao : it.peso;
                                updateItem(p.fileId, idx, {
                                  codigo_produto: cod,
                                  nome_produto: hit?.nome_produto ?? it.nome_produto,
                                  pesoPadrao: novoPesoPadrao,
                                  peso: novoPeso,
                                  produtoCadastrado: !!hit,
                                });
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            {idx === 0 && <Label className="text-xs hidden sm:block">Produto</Label>}
                            <div className="flex items-center gap-1">
                              <Input value={it.nome_produto} readOnly className="h-8 text-sm bg-muted/50" />
                              {!it.produtoCadastrado && (
                                <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400 shrink-0 text-[10px] px-1">novo</Badge>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            {idx === 0 && <Label className="text-xs hidden sm:block">Peso (kg)</Label>}
                            <Input
                              type="number"
                              step="0.01"
                              value={it.peso}
                              onChange={(e) => handleItemPeso(p.fileId, idx, Number(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            {idx === 0 && <Label className="text-xs hidden sm:block">Qtd</Label>}
                            <Input
                              type="number"
                              step="0.01"
                              value={it.quantidade}
                              onChange={(e) => handleItemQuantidade(p.fileId, idx, Number(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            {idx === 0 && <Label className="text-xs hidden sm:block sr-only">Ruptura</Label>}
                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                              <Checkbox
                                checked={it.ruptura}
                                onCheckedChange={(v) => updateItem(p.fileId, idx, { ruptura: !!v })}
                              />
                              <span>Ruptura</span>
                            </label>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(p.fileId, idx)} title="Remover">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          {it.ruptura && (
                            <div className="col-span-2 sm:col-span-6 -mt-1">
                              <Input
                                placeholder="Motivo da ruptura (opcional)"
                                value={it.motivo_ruptura}
                                onChange={(e) => updateItem(p.fileId, idx, { motivo_ruptura: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isParsing || isSubmitting || okPedidos.length === 0 || totalItens === 0}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Salvar {okPedidos.length} pedido{okPedidos.length === 1 ? "" : "s"} ({totalItens} {totalItens === 1 ? "item" : "itens"})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}