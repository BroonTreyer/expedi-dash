import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Adiantamento } from "@/hooks/useAdiantamentos";

const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

type CteResumo = { id: string; numero_cte: string; serie: string | null; valor_frete: number; ordem_carga: string | null };

interface Props {
  adiantamentos: Adiantamento[] | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (ids: string[]) => void;
  isPending?: boolean;
}

/**
 * Exclusão DEFINITIVA de adiantamentos + CT-es vinculados.
 * Lista os CT-es que serão apagados e exige digitar APAGAR.
 */
export function ApagarAdiantamentosDialog({ adiantamentos, onOpenChange, onConfirm, isPending }: Props) {
  const open = !!adiantamentos && adiantamentos.length > 0;
  const ids = useMemo(() => (adiantamentos ?? []).map((a) => a.id), [adiantamentos]);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    if (!open) setTexto("");
  }, [open]);

  const { data: ctes = [], isLoading } = useQuery({
    queryKey: ["adt_ctes_para_apagar", ids],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("adiantamentos_frete_ctes")
        .select("cte_id, ctes_dacte(id, numero_cte, serie, valor_frete, ordem_carga)")
        .in("adiantamento_id", ids);
      if (error) throw error;
      const map = new Map<string, CteResumo>();
      for (const r of (data ?? []) as any[]) {
        const c = r.ctes_dacte;
        if (c && !map.has(c.id)) map.set(c.id, c);
      }
      return [...map.values()].sort((a, b) => Number(a.numero_cte) - Number(b.numero_cte));
    },
  });

  const total = ctes.reduce((s, c) => s + Number(c.valor_frete || 0), 0);
  const ok = texto.trim().toUpperCase() === "APAGAR";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Apagar adiantamento(s) e CT-es
          </DialogTitle>
          <DialogDescription>
            Esta ação é <strong>definitiva</strong>: apaga {ids.length} adiantamento(s) <strong>e exclui os CT-es abaixo do sistema</strong>.
            Para só desfazer o adiantamento e manter os CT-es disponíveis, use <strong>Cancelar</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 max-h-56 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando CT-es…</p>
          ) : ctes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum CT-e vinculado será excluído.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                {ctes.length} CT-e(s) · {fmtBRL(total)} serão excluídos:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ctes.map((c) => (
                  <Badge key={c.id} variant="outline" className="font-mono text-xs">
                    {c.numero_cte}{c.serie ? `/${c.serie}` : ""}
                    {c.ordem_carga ? <span className="ml-1 text-muted-foreground">OC {c.ordem_carga}</span> : null}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm">Digite <span className="font-mono font-semibold">APAGAR</span> para confirmar</label>
          <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="APAGAR" autoComplete="off" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Voltar</Button>
          <Button variant="destructive" disabled={!ok || isPending || isLoading} onClick={() => onConfirm(ids)}>
            <Trash2 className="h-4 w-4 mr-1" /> Apagar definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
