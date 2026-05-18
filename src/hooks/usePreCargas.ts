import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { fetchAllPaginated } from "@/lib/supabase-paginate";
import type { Carregamento } from "@/hooks/useCarregamentos";

/**
 * Carrega TODAS as linhas de carregamentos_dia com etapa = 'pre_carga'
 * (sem filtro de data). A página de Pré-cargas precisa de visão completa.
 * Inclui realtime básico — qualquer mudança em carregamentos_dia invalida o cache.
 */
export function usePreCargas() {
  const session = useSession();
  const qc = useQueryClient();

  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel("pre-cargas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carregamentos_dia" },
        () => qc.invalidateQueries({ queryKey: ["pre-cargas"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, qc]);

  return useQuery({
    queryKey: ["pre-cargas"],
    enabled: !!session,
    queryFn: async () => {
      const rows = await fetchAllPaginated<any>((from, to) =>
        supabase
          .from("carregamentos_dia")
          .select("*, vendedores(nome_vendedor)")
          .eq("etapa", "pre_carga")
          .order("data", { ascending: false })
          .order("carga_id", { ascending: true })
          .order("numero_pedido", { ascending: true })
          .range(from, to),
      );
      return rows as (Carregamento & { ruptura_sinalizada?: boolean; forma_pagamento?: string | null })[];
    },
    staleTime: 30_000,
  });
}