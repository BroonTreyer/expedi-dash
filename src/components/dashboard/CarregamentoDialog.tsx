import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATUSES, UF_LIST } from "@/lib/constants";
import type { Carregamento } from "@/hooks/useCarregamentos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, any>) => void;
  editing: Carregamento | null;
  vendedores: { id: string; nome_vendedor: string }[];
  tiposCaminhao: { nome_tipo: string }[];
  produtos: { codigo_produto: string; nome_produto: string; peso_padrao: number | null }[];
  selectedDate: string;
}

export function CarregamentoDialog({ open, onOpenChange, onSubmit, editing, vendedores, tiposCaminhao, produtos, selectedDate }: Props) {
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (editing) {
      setForm({ ...editing });
    } else {
      setForm({ data: selectedDate, status: "Aguardando", quantidade: 1, peso: 0 });
    }
  }, [editing, open, selectedDate]);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleCodigoProduto = (codigo: string) => {
    set("codigo_produto", codigo);
    const found = produtos.find((p) => p.codigo_produto.toLowerCase() === codigo.toLowerCase());
    if (found) {
      set("nome_produto", found.nome_produto);
      if (!form.peso || form.peso === 0) set("peso", found.peso_padrao ?? 0);
    }
  };

  const handleSubmit = () => {
    const payload: Record<string, any> = { ...form };
    // Remove relation fields
    delete payload.vendedores;
    if (editing) payload.id = editing.id;
    onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Carregamento" : "Novo Carregamento"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Data</Label>
            <Input type="date" value={form.data ?? ""} onChange={(e) => set("data", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={form.status ?? "Aguardando"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Vendedor *</Label>
            <Select value={form.vendedor_id ?? ""} onValueChange={(v) => set("vendedor_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome_vendedor}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Código Produto</Label>
            <Input value={form.codigo_produto ?? ""} onChange={(e) => handleCodigoProduto(e.target.value)} placeholder="Digite o código" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nome Produto</Label>
            <Input value={form.nome_produto ?? ""} onChange={(e) => set("nome_produto", e.target.value)} readOnly className="bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Quantidade</Label>
            <Input type="number" value={form.quantidade ?? 0} onChange={(e) => set("quantidade", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Peso (kg)</Label>
            <Input type="number" value={form.peso ?? 0} onChange={(e) => set("peso", Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo Caminhão</Label>
            <Select value={form.tipo_caminhao ?? ""} onValueChange={(v) => set("tipo_caminhao", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{tiposCaminhao.map((t) => <SelectItem key={t.nome_tipo} value={t.nome_tipo}>{t.nome_tipo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Placa</Label>
            <Input value={form.placa ?? ""} onChange={(e) => set("placa", e.target.value.toUpperCase())} placeholder="ABC1D23" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Motorista</Label>
            <Input value={form.motorista ?? ""} onChange={(e) => set("motorista", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cidade</Label>
            <Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">UF</Label>
            <Select value={form.uf ?? ""} onValueChange={(v) => set("uf", v)}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>{UF_LIST.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Horário Previsto</Label>
            <Input type="time" value={form.horario_previsto ?? ""} onChange={(e) => set("horario_previsto", e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.vendedor_id}>
            {editing ? "Salvar" : "Criar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
