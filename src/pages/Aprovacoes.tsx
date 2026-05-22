import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, Inbox, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAprovacoesPendentes, useAprovarPedidos, useRejeitarPedidos } from "@/hooks/useAprovacoes";
import { EditarPedidoAprovacaoDialog } from "@/components/aprovacoes/EditarPedidoAprovacaoDialog";

export default function Aprovacoes() {
  const { data: pedidos = [], isLoading } = useAprovacoesPendentes();
  const aprovar = useAprovarPedidos();
  const rejeitar = useRejeitarPedidos();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectOpen, setRejectOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [editGrupo, setEditGrupo] = useState<any[] | null>(null);

  const grupos = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const p of pedidos as any[]) {
      const key = `${p.vendedor_id}__${p.data}__${p.numero_pedido}__${p.codigo_cliente ?? ""}`;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return Array.from(map.values());
  }, [pedidos]);

  const toggleGroup = (g: any[]) => {
    setSelected((prev) => {
      const n = new Set(prev);
      const all = g.every((r) => n.has(r.id));
      g.forEach((r) => all ? n.delete(r.id) : n.add(r.id));
      return n;
    });
  };

  const selectedIds = Array.from(selected);

  const handleAprovar = async () => {
    await aprovar.mutateAsync(selectedIds);
    setSelected(new Set());
  };
  const handleRejeitar = async () => {
    await rejeitar.mutateAsync({ ids: selectedIds, motivo: motivo.trim() || "Devolvido para ajustes" });
    setSelected(new Set());
    setMotivo("");
    setRejectOpen(false);
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Inbox className="h-5 w-5 text-muted-foreground" /> Aprovações
              {grupos.length > 0 && <Badge variant="secondary">{grupos.length}</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground">Pedidos enviados pelos vendedores aguardando sua aprovação.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" disabled={selectedIds.length === 0} onClick={() => setRejectOpen(true)} className="gap-1 flex-1 sm:flex-none h-10 sm:h-9">
              <XCircle className="h-4 w-4" /> Devolver ({selectedIds.length})
            </Button>
            <Button disabled={selectedIds.length === 0 || aprovar.isPending} onClick={handleAprovar} className="gap-1 flex-1 sm:flex-none h-10 sm:h-9">
              <CheckCircle2 className="h-4 w-4" /> Aprovar ({selectedIds.length})
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : grupos.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <p className="text-sm">Nenhum pedido aguardando aprovação.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {grupos.map((g, i) => {
              const head = g[0];
              const allSel = g.every((r) => selected.has(r.id));
              const totalPeso = g.reduce((s, r) => s + Number(r.peso ?? 0), 0);
              const totalValor = g.reduce((s, r) => s + Number(r.preco_total ?? 0), 0);
              return (
                <Card key={i} className="p-3">
                  <div className="flex items-start gap-2">
                    <Checkbox checked={allSel} onCheckedChange={() => toggleGroup(g)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <p className="font-semibold truncate">{head.cliente ?? "Sem cliente"}</p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(head.data + "T00:00"), "dd/MM", { locale: ptBR })} · #{head.numero_pedido}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Vendedor: <span className="font-medium text-foreground">{head.vendedores?.nome_vendedor ?? "—"}</span>
                        {head.cidade ? ` · ${head.cidade}/${head.uf ?? ""}` : ""}
                      </p>
                      {head.forma_pagamento && (
                        <p className="text-[11px] mt-1">
                          <Badge variant="outline" className="font-normal">
                            {head.forma_pagamento}
                          </Badge>
                        </p>
                      )}
                      <ul className="mt-2 space-y-0.5">
                        {g.map((r) => (
                          <li key={r.id} className="text-xs flex justify-between gap-2">
                            <span className="truncate">{r.nome_produto ?? "—"}</span>
                            <span className="tabular-nums text-muted-foreground whitespace-nowrap">
                              {Number(r.peso ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg
                              {Number(r.preco_unitario ?? 0) > 0 && (
                                <> · {Number(r.preco_unitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/un
                                  {" = "}
                                  <span className="font-medium text-foreground">{Number(r.preco_total ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                                </>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Total: <span className="font-semibold text-foreground">{totalPeso.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</span>
                        {totalValor > 0 && (
                          <> · <span className="font-semibold text-foreground">{totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></>
                        )}
                      </div>
                      {head.observacoes && (
                        <p className="mt-1 text-[11px] italic text-muted-foreground">"{head.observacoes}"</p>
                      )}
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => setEditGrupo(g)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver pedido(s) ao vendedor</DialogTitle>
            <DialogDescription>Informe o motivo. Os pedidos voltarão para "Rascunho" no painel do vendedor.</DialogDescription>
          </DialogHeader>
          <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: Verificar quantidade do produto X" rows={3} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRejeitar} disabled={rejeitar.isPending}>Devolver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditarPedidoAprovacaoDialog
        open={!!editGrupo}
        onOpenChange={(o) => { if (!o) setEditGrupo(null); }}
        grupo={editGrupo}
      />
    </Layout>
  );
}