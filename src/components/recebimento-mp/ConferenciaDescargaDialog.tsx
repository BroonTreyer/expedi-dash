import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import {
  useRecebimentoMpItens,
  useSaveRecebimentoMpItens,
  useUpdateRecebimentoMp,
  uploadRecebimentoMpFile,
  type RecebimentoMp,
  type RecebimentoMpItem,
} from "@/hooks/useRecebimentosMp";
import { useFornecedoresMp, useUpsertFornecedorMp } from "@/hooks/useFornecedoresMp";
import { useProdutosMp } from "@/hooks/useProdutosMp";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizarParaTon, formatarTon, formatarBRL, parseNumeroBR, LIMITE_SUSPEITO_TON, type UnidadePeso } from "@/lib/peso-mp";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recebimento: RecebimentoMp | null;
}

type ItemDraft = {
  produto_id: string | null;
  nome_produto: string;
  nota_fiscal: string;
  peso_ton: string; // string para input pt-BR
  valor_unitario: string;
  unidade: UnidadePeso;
};

const parseNum = parseNumeroBR;
const fmtBRL = formatarBRL;
const fmtTon = formatarTon;

export function ConferenciaDescargaDialog({ open, onOpenChange, recebimento }: Props) {
  const { data: itensExistentes = [] } = useRecebimentoMpItens(recebimento?.id);
  const { data: fornecedores = [] } = useFornecedoresMp();
  const { data: produtos = [] } = useProdutosMp();
  const saveItens = useSaveRecebimentoMpItens();
  const updateRec = useUpdateRecebimentoMp();
  const upsertFornecedor = useUpsertFornecedorMp();

  const valorPadrao = recebimento?.valor_tonelada ?? 35;

  const [itens, setItens] = useState<ItemDraft[]>([]);
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [conferente, setConferente] = useState("");
  const [doca, setDoca] = useState("");
  const [palletsQtd, setPalletsQtd] = useState("");
  const [palletsDev, setPalletsDev] = useState(false);
  const [fotoNotaFile, setFotoNotaFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open || !recebimento) return;
    setFornecedorNome(recebimento.fornecedor_nome ?? "");
    setFornecedorId(recebimento.fornecedor_id ?? null);
    setConferente(recebimento.conferente ?? "");
    setDoca(recebimento.doca_setor ?? "");
    setPalletsQtd(recebimento.pallets_quantidade?.toString() ?? "");
    setPalletsDev(!!recebimento.pallets_devolvidos);
    setFotoNotaFile(null);
    if (itensExistentes.length > 0) {
      setItens(itensExistentes.map((i) => ({
        produto_id: i.produto_id,
        nome_produto: i.nome_produto,
        nota_fiscal: i.nota_fiscal ?? "",
        peso_ton: i.peso_ton.toString().replace(".", ","),
        valor_unitario: i.valor_unitario.toString().replace(".", ","),
        unidade: "ton" as UnidadePeso,
      })));
    } else {
      setItens([{ produto_id: null, nome_produto: "", nota_fiscal: "", peso_ton: "", valor_unitario: String(valorPadrao).replace(".", ","), unidade: "ton" }]);
    }
  }, [open, recebimento, itensExistentes.length]);

  const totals = useMemo(() => {
    let peso = 0, valor = 0;
    for (const it of itens) {
      const p = normalizarParaTon(parseNum(it.peso_ton), it.unidade);
      const v = parseNum(it.valor_unitario);
      peso += p; valor += p * v;
    }
    return { peso, valor };
  }, [itens]);

  function addRow() {
    setItens([...itens, { produto_id: null, nome_produto: "", nota_fiscal: "", peso_ton: "", valor_unitario: String(valorPadrao).replace(".", ","), unidade: "ton" }]);
  }
  function delRow(i: number) {
    setItens(itens.filter((_, idx) => idx !== i));
  }
  function updRow(i: number, patch: Partial<ItemDraft>) {
    setItens(itens.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  }

  async function handleConfirm() {
    if (!recebimento) return;
    const itensValidos = itens.filter((it) => it.nome_produto.trim() && parseNum(it.peso_ton) > 0);
    if (itensValidos.length === 0) {
      toast.error("Adicione ao menos 1 produto com peso > 0");
      return;
    }
    // Aviso anti-erro: peso suspeito em ton (provavelmente é kg)
    const suspeitos = itensValidos.filter((it) => it.unidade === "ton" && parseNum(it.peso_ton) > LIMITE_SUSPEITO_TON);
    if (suspeitos.length > 0) {
      const ok = window.confirm(
        `Atenção: ${suspeitos.length} produto(s) com peso acima de ${LIMITE_SUSPEITO_TON} toneladas.\n` +
        `Isso parece estar em KG. Deseja continuar mesmo assim?\n\n` +
        `(Cancele e troque a unidade para "kg" se for o caso — o sistema converte automaticamente.)`
      );
      if (!ok) return;
    }
    try {
      // Upload da NF se houver
      let fotoNotaUrl = recebimento.foto_nota_url;
      if (fotoNotaFile) {
        fotoNotaUrl = await uploadRecebimentoMpFile(fotoNotaFile, recebimento.id, "nota");
      }

      // Cria fornecedor se digitado livre
      let fId = fornecedorId;
      let fNome = fornecedorNome.trim();
      if (fNome && !fId) {
        const existing = fornecedores.find((f) => f.nome.toLowerCase() === fNome.toLowerCase());
        if (existing) fId = existing.id;
        else {
          const created = await upsertFornecedor.mutateAsync({ nome: fNome });
          fId = created.id;
        }
      }

      // Salva itens
      await saveItens.mutateAsync({
        recebimentoId: recebimento.id,
        itens: itensValidos.map((it) => ({
          produto_id: it.produto_id,
          nome_produto: it.nome_produto.trim(),
          nota_fiscal: it.nota_fiscal.trim() || null,
          peso_ton: normalizarParaTon(parseNum(it.peso_ton), it.unidade),
          valor_unitario: parseNum(it.valor_unitario) || valorPadrao,
        })),
      });

      // Atualiza cabeçalho + status
      await updateRec.mutateAsync({
        id: recebimento.id,
        fornecedor_id: fId,
        fornecedor_nome: fNome || null,
        conferente: conferente.trim() || null,
        doca_setor: doca.trim() || null,
        pallets_quantidade: palletsQtd ? Number(palletsQtd) : 0,
        pallets_devolvidos: palletsDev,
        foto_nota_url: fotoNotaUrl,
        data_descarga: new Date().toISOString().slice(0, 10),
        status_geral: "aguardando_pagamento",
      });

      toast.success("Descarga conferida — aguardando pagamento");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao confirmar");
    }
  }

  if (!recebimento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conferência da Descarga</DialogTitle>
          <DialogDescription>
            Recibo {recebimento.recibo_numero} · Motorista {recebimento.motorista ?? "—"} · Placa {recebimento.placa ?? "—"}
          </DialogDescription>
        </DialogHeader>

        {/* Cabeçalho de recebimento */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label>Fornecedor *</Label>
            <Input
              list="fornecedores-mp-list"
              value={fornecedorNome}
              onChange={(e) => {
                setFornecedorNome(e.target.value);
                const f = fornecedores.find((x) => x.nome.toLowerCase() === e.target.value.toLowerCase());
                setFornecedorId(f?.id ?? null);
              }}
              placeholder="Buscar ou digitar novo..."
            />
            <datalist id="fornecedores-mp-list">
              {fornecedores.map((f) => <option key={f.id} value={f.nome} />)}
            </datalist>
          </div>
          <div>
            <Label>Conferente</Label>
            <Input value={conferente} onChange={(e) => setConferente(e.target.value)} />
          </div>
          <div>
            <Label>Doca / Setor</Label>
            <Input value={doca} onChange={(e) => setDoca(e.target.value)} placeholder="Doca 1, Setor A..." />
          </div>
          <div>
            <Label>Pallets (quantidade)</Label>
            <Input type="number" min={0} value={palletsQtd} onChange={(e) => setPalletsQtd(e.target.value)} />
          </div>
          <div className="flex items-end gap-3 pb-2">
            <Label htmlFor="pallets-dev" className="cursor-pointer">Devolveu pallets?</Label>
            <Switch id="pallets-dev" checked={palletsDev} onCheckedChange={setPalletsDev} />
            <span className="text-sm text-muted-foreground">{palletsDev ? "Sim" : "Não"}</span>
          </div>
          <div className="md:col-span-3">
            <Label>Foto da Nota Fiscal (opcional)</Label>
            <Input type="file" accept="image/*" capture="environment" onChange={(e) => setFotoNotaFile(e.target.files?.[0] ?? null)} />
          </div>
        </section>

        {/* Produtos */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Produtos descarregados</h3>
            <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Adicionar produto</Button>
          </div>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Nota Fiscal</TableHead>
                <TableHead className="w-32 text-right">Peso</TableHead>
                <TableHead className="w-20">Unid.</TableHead>
                  <TableHead className="w-28 text-right">R$/ton</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((it, i) => {
                const pesoTon = normalizarParaTon(parseNum(it.peso_ton), it.unidade);
                const total = pesoTon * parseNum(it.valor_unitario);
                const suspeito = it.unidade === "ton" && parseNum(it.peso_ton) > LIMITE_SUSPEITO_TON;
                  return (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          list="produtos-mp-list"
                          value={it.nome_produto}
                          onChange={(e) => {
                            const v = e.target.value;
                            const p = produtos.find((x) => x.nome.toLowerCase() === v.toLowerCase());
                            updRow(i, { nome_produto: v, produto_id: p?.id ?? null });
                          }}
                          placeholder="Ex.: Frango, Suíno..."
                        />
                      </TableCell>
                      <TableCell>
                        <Input value={it.nota_fiscal} onChange={(e) => updRow(i, { nota_fiscal: e.target.value })} />
                      </TableCell>
                      <TableCell>
                      <Input
                        className={`text-right ${suspeito ? "border-amber-500 ring-1 ring-amber-500" : ""}`}
                        value={it.peso_ton}
                        onChange={(e) => updRow(i, { peso_ton: e.target.value })}
                        placeholder="0,000"
                      />
                      {it.unidade === "kg" && parseNum(it.peso_ton) > 0 && (
                        <div className="text-[10px] text-muted-foreground text-right mt-0.5">= {fmtTon(pesoTon)}</div>
                      )}
                      {suspeito && (
                        <div className="text-[10px] text-amber-600 text-right mt-0.5">Parece kg?</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select value={it.unidade} onValueChange={(v) => updRow(i, { unidade: v as UnidadePeso })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ton">ton</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                        </SelectContent>
                      </Select>
                      </TableCell>
                      <TableCell>
                        <Input className="text-right" value={it.valor_unitario} onChange={(e) => updRow(i, { valor_unitario: e.target.value })} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{fmtBRL(total)}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => delRow(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <datalist id="produtos-mp-list">
              {produtos.map((p) => <option key={p.id} value={p.nome} />)}
            </datalist>
          </div>
          <div className="flex items-center justify-end gap-6 mt-3 text-sm">
            <div>Subtotal: <span className="font-bold tabular-nums">{fmtTon(totals.peso)}</span></div>
            <div className="text-base">Valor total: <span className="font-bold tabular-nums text-primary">{fmtBRL(totals.valor)}</span></div>
          </div>
        </section>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saveItens.isPending || updateRec.isPending}>
            Confirmar Descarga
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
