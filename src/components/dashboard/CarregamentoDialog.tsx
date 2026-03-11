import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATUSES, UF_LIST } from "@/lib/constants";
import type { Carregamento } from "@/hooks/useCarregamentos";

export type DialogMode = "vendas" | "logistica" | "editar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, any>) => void;
  editing: Carregamento | null;
  mode: DialogMode;
  vendedores: { id: string; nome_vendedor: string; codigo_vendedor: string }[];
  tiposCaminhao: { nome_tipo: string }[];
  produtos: { codigo_produto: string; nome_produto: string; peso_padrao: number | null }[];
  selectedDate: string;
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

export function CarregamentoDialog({ open, onOpenChange, onSubmit, editing, mode, vendedores, tiposCaminhao, produtos, selectedDate }: Props) {
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (editing) {
      setForm({ ...editing });
    } else {
      setForm({ data: selectedDate, status: "Aguardando", etapa: "vendas", quantidade: 1, peso: 0 });
    }
  }, [editing, open, selectedDate]);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleCodigoVendedor = (codigo: string) => {
    const found = vendedores.find((v) => v.codigo_vendedor === codigo);
    if (found) {
      set("vendedor_id", found.id);
    }
  };

  const handleCodigoProduto = (codigo: string) => {
    set("codigo_produto", codigo);
    const found = produtos.find((p) => p.codigo_produto.toLowerCase() === codigo.toLowerCase());
    if (found) {
      set("nome_produto", found.nome_produto);
      set("peso", found.peso_padrao ?? 0);
    }
  };

  const handleSubmit = () => {
    const payload: Record<string, any> = { ...form };
    delete payload.vendedores;
    if (editing) payload.id = editing.id;
    if (mode === "logistica") {
      payload.etapa = "logistica";
    }
    onSubmit(payload);
    onOpenChange(false);
  };

  const showVendas = mode === "vendas" || mode === "editar";
  const showLogistica = mode === "logistica" || mode === "editar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TITLES[mode]}</DialogTitle>
          <DialogDescription>{DESCRIPTIONS[mode]}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          {/* === VENDAS FIELDS === */}
          {showVendas && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Data</Label>
                <Input type="date" value={form.data ?? ""} onChange={(e) => set("data", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cód. Vendedor</Label>
                <Input
                  value={(() => { const v = vendedores.find(v => v.id === form.vendedor_id); return v?.codigo_vendedor ?? ""; })()}
                  onChange={(e) => {
                    const codigo = e.target.value;
                    handleCodigoVendedor(codigo);
                  }}
                  placeholder="Ex: 114"
                  className="w-full"
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
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Observações</Label>
                <Textarea value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} rows={2} />
              </div>
            </>
          )}

          {/* === LOGÍSTICA FIELDS === */}
          {showLogistica && (
            <>
              {mode === "editar" && (
                <div className="col-span-2 border-t border-border pt-3 mt-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados de Transporte</span>
                </div>
              )}
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
            <div className="col-span-2 rounded-md bg-muted/50 p-3 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados do Pedido</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
                <span className="text-muted-foreground">Vendedor:</span>
                <span>{editing.vendedores?.nome_vendedor ?? "—"}</span>
                <span className="text-muted-foreground">Produto:</span>
                <span>{editing.nome_produto ?? editing.codigo_produto ?? "—"}</span>
                <span className="text-muted-foreground">Qtd / Peso:</span>
                <span>{editing.quantidade ?? 0} un / {(editing.peso ?? 0).toLocaleString("pt-BR")} kg</span>
                <span className="text-muted-foreground">Destino:</span>
                <span>{editing.cidade ?? "—"}{editing.uf ? `/${editing.uf}` : ""}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
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
