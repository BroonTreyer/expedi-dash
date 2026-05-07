import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { calcularFreteTabela, type ItemTabelaFrete, type DestinoFrete } from "@/lib/calcularFreteTabela";
import type { RotaGroup } from "./RoteirizacaoDialog";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FreteTabelaCard({
  groups,
  tipoCaminhao,
}: {
  groups: RotaGroup[];
  tipoCaminhao: string | null | undefined;
}) {
  const session = useSession();
  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["tabelas_frete_itens", "all"],
    enabled: !!session,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tabelas_frete_itens")
        .select("tabela_id, codigo_cliente, destino_cidade, destino_uf, valor_kg_bitruck, valor_kg_carreta, ativo");
      if (error) throw error;
      return (data ?? []) as ItemTabelaFrete[];
    },
  });

  const destinos: DestinoFrete[] = useMemo(
    () =>
      groups
        .filter((g) => g.cidade && g.uf)
        .map((g) => ({
          cidade: g.cidade!,
          uf: g.uf!,
          peso: g.pesoTotal || 0,
          codigo_cliente: g.codigoCliente ?? null,
          nomeCliente: g.nomeCliente ?? null,
        })),
    [groups],
  );

  const resultado = useMemo(
    () => calcularFreteTabela(destinos, itens, tipoCaminhao),
    [destinos, itens, tipoCaminhao],
  );

  if (destinos.length === 0) return null;

  return (
    <div className="border-t border-border pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
          Frete (Tabela)
        </span>
        <div className="flex items-center gap-2">
          {resultado.semTarifa > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 border-amber-400/60 bg-amber-500/10 text-amber-700">
              {resultado.semTarifa} sem tarifa
            </Badge>
          )}
          {resultado.conflitos > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 border-destructive/60 bg-destructive/10 text-destructive">
              {resultado.conflitos} conflito(s)
            </Badge>
          )}
          <span className="text-sm font-semibold tabular-nums">
            {isLoading ? "…" : fmt(resultado.total)}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {resultado.detalhes.map((d, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-xs rounded-md border border-border/60 bg-muted/30 px-2 py-1"
          >
            <div className="truncate">
              <span className="font-medium">
                {d.cidade}/{d.uf}
              </span>
              {d.cliente && (
                <span className="text-muted-foreground"> · {d.cliente}</span>
              )}
              <span className="text-muted-foreground">
                {" "}· {d.peso.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg
              </span>
            </div>
            <div className="tabular-nums text-right">
              {d.status === "ok" && (
                <>
                  <span className="text-muted-foreground mr-1">
                    {fmt(d.valor_kg)}/kg
                  </span>
                  <span className="font-medium">{fmt(d.subtotal)}</span>
                </>
              )}
              {d.status === "sem_tarifa" && (
                <span className="text-amber-700">sem tarifa</span>
              )}
              {d.status === "conflito" && (
                <span className="text-destructive">conflito</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}