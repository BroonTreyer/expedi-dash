import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Send, Pencil, Trash2, FileText, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NovoPedidoDialog, type NovoPedidoSubmit } from "./NovoPedidoDialog";

interface Props {
  vendedorId: string;
  meusPedidos: any[];
  carregamentos: any[]; // pedidos aprovados (etapa vendas+)
  readOnly?: boolean;
}

/** Agrupa por (data + numero_pedido + codigo_cliente) — convenção do sistema. */
function groupOrders(rows: any[]) {
  const groups = new Map<string, any[]>();
  for (const r of rows) {
    const key = `${r.data}__${r.numero_pedido ?? r.id}__${r.codigo_cliente ?? ""}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  return Array.from(groups.values());
}

export function MeusPedidos({ vendedorId, meusPedidos, carregamentos, readOnly }: Props) {
  const qc = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const rascunhos = useMemo(() => groupOrders(meusPedidos.filter((p) => p.etapa === "rascunho")), [meusPedidos]);
  const aguardando = useMemo(() => groupOrders(meusPedidos.filter((p) => p.etapa === "aguardando_faturamento")), [meusPedidos]);
  const aprovados = useMemo(() => groupOrders(carregamentos), [carregamentos]);
  const totalPedidos = rascunhos.length + aguardando.length + aprovados.length;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["meu-painel"] });
    qc.invalidateQueries({ queryKey: ["carregamentos"] });
  };

  const handleSubmit = async (payload: NovoPedidoSubmit) => {
    if (readOnly) return;
    setSubmitting(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const etapa = payload.enviarParaAprovacao ? "aguardando_faturamento" : "rascunho";

      if (payload.editingId) {
        // Editar: atualiza todos os irmãos do mesmo pedido (mesma cliente+data+numero)
        const ed = meusPedidos.find((m) => m.id === payload.editingId);
        if (!ed) throw new Error("Pedido não encontrado");
        const irmaos = meusPedidos.filter(
          (m) => m.data === ed.data && m.numero_pedido === ed.numero_pedido && m.codigo_cliente === ed.codigo_cliente,
        );
        // Estratégia simples: deletar irmãos e re-inserir os novos itens
        const ids = irmaos.map((m) => m.id);
        const { error: dErr } = await supabase.from("carregamentos_dia").delete().in("id", ids);
        if (dErr) throw dErr;
        const rows = payload.items.map((it) => ({
          data: ed.data,
          numero_pedido: ed.numero_pedido,
          vendedor_id: vendedorId,
          codigo_cliente: payload.cliente.codigo_cliente,
          cliente: payload.cliente.nome_cliente,
          cidade: payload.cliente.cidade,
          uf: payload.cliente.uf,
          codigo_produto: it.codigo_produto,
          nome_produto: it.nome_produto,
          quantidade: it.quantidade,
          peso: it.peso,
          peso_manual: true,
          preco_unitario: it.preco_unitario || null,
          preco_total: it.preco_total || null,
          etapa,
          status: "Aguardando",
          observacoes: payload.observacoes || null,
        }));
        const { error: iErr } = await supabase.from("carregamentos_dia").insert(rows);
        if (iErr) throw iErr;
      } else {
        // Criar: 1 número de pedido para o lote
        const { data: numero, error: nErr } = await supabase.rpc("next_numero_pedido", { _data: today });
        if (nErr) throw nErr;
        const rows = payload.items.map((it) => ({
          data: today,
          numero_pedido: numero,
          vendedor_id: vendedorId,
          codigo_cliente: payload.cliente.codigo_cliente,
          cliente: payload.cliente.nome_cliente,
          cidade: payload.cliente.cidade,
          uf: payload.cliente.uf,
          codigo_produto: it.codigo_produto,
          nome_produto: it.nome_produto,
          quantidade: it.quantidade,
          peso: it.peso,
          peso_manual: true,
          preco_unitario: it.preco_unitario || null,
          preco_total: it.preco_total || null,
          etapa,
          status: "Aguardando",
          observacoes: payload.observacoes || null,
        }));
        const { error: iErr } = await supabase.from("carregamentos_dia").insert(rows);
        if (iErr) throw iErr;
      }

      toast.success(payload.enviarParaAprovacao ? "Pedido enviado para o faturamento" : "Rascunho salvo");
      setOpenDialog(false);
      setEditing(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar pedido");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnviar = async (group: any[]) => {
    if (readOnly) return;
    const ids = group.map((g) => g.id);
    const { error } = await supabase
      .from("carregamentos_dia")
      .update({ etapa: "aguardando_faturamento" })
      .in("id", ids);
    if (error) return toast.error(error.message);
    toast.success("Pedido enviado para o faturamento");
    refresh();
  };

  const handleExcluir = async (group: any[]) => {
    if (readOnly) return;
    if (!confirm(`Excluir este rascunho com ${group.length} item(ns)?`)) return;
    const ids = group.map((g) => g.id);
    const { error } = await supabase.from("carregamentos_dia").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success("Rascunho excluído");
    refresh();
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-base font-semibold">Meus Pedidos</h2>
          <p className="text-xs text-muted-foreground">Crie pedidos, salve como rascunho e envie para o faturamento aprovar.</p>
        </div>
        {!readOnly && (
          <Button size="sm" className="gap-1" onClick={() => { setEditing(null); setOpenDialog(true); }}>
            <Plus className="h-4 w-4" /> Novo pedido
          </Button>
        )}
      </div>

      {!readOnly && totalPedidos === 0 && (
        <Card className="p-6 mb-3 text-center border-dashed">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <h3 className="text-sm font-semibold">Você ainda não tem pedidos no período</h3>
          <p className="text-xs text-muted-foreground mb-3">Comece registrando o primeiro pedido — você pode salvar como rascunho e enviar depois.</p>
          <Button size="sm" className="gap-1" onClick={() => { setEditing(null); setOpenDialog(true); }}>
            <Plus className="h-4 w-4" /> Registrar primeiro pedido
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Section
          title="Rascunhos"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          tone="neutral"
          empty="Nenhum rascunho."
          groups={rascunhos}
          renderActions={(g) => (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditing(g[0]); setOpenDialog(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => handleExcluir(g)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="h-7 gap-1 ml-1" onClick={() => handleEnviar(g)}>
                <Send className="h-3.5 w-3.5" /> Enviar
              </Button>
            </div>
          )}
        />
        <Section
          title="Aguardando aprovação"
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          tone="amber"
          empty="Nenhum pedido aguardando."
          groups={aguardando}
        />
        <Section
          title="Aprovados"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          tone="emerald"
          empty="Nenhum pedido aprovado no período."
          groups={aprovados}
        />
      </div>

      <NovoPedidoDialog
        open={openDialog}
        onOpenChange={(o) => { if (!o) setEditing(null); setOpenDialog(o); }}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        editing={editing}
      />
    </>
  );
}

function Section({
  title, icon, empty, groups, renderActions, tone,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  groups: any[][];
  renderActions?: (group: any[]) => React.ReactNode;
  tone: "neutral" | "amber" | "emerald";
}) {
  const toneClass = tone === "amber"
    ? "border-amber-200 bg-amber-50/40"
    : tone === "emerald"
    ? "border-emerald-200 bg-emerald-50/40"
    : "";
  return (
    <Card className={`p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">{groups.length}</Badge>
      </div>
      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">{empty}</p>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {groups.map((g, i) => {
            const head = g[0];
            const totalPeso = g.reduce((s, r) => s + Number(r.peso ?? 0), 0);
            const totalValor = g.reduce((s, r) => s + Number(r.preco_total ?? 0), 0);
            return (
              <div key={i} className="rounded-md border bg-background p-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{head.cliente ?? "Sem cliente"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {head.codigo_cliente ? `#${head.codigo_cliente}` : ""}
                      {head.cidade ? ` · ${head.cidade}/${head.uf ?? ""}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(head.data + "T00:00"), "dd/MM", { locale: ptBR })}
                  </span>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {g.map((r) => (
                    <li key={r.id} className="text-[11px] flex justify-between gap-2">
                      <span className="truncate">{r.nome_produto ?? "—"}</span>
                      <span className="tabular-nums text-muted-foreground whitespace-nowrap">
                        {Number(r.peso ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">{totalPeso.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</span>
                    {totalValor > 0 && (
                      <> · <span className="font-semibold text-foreground">{totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></>
                    )}
                  </span>
                  {renderActions?.(g)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}