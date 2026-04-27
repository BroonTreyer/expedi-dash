import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useSession } from "@/hooks/useAuth";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

export interface MeuPainelData {
  vendedorId: string | null;
  vendedorNome: string | null;
  carregamentos: any[];
}

/** Busca o vendedor vinculado ao login + os pedidos dele no intervalo. */
export function useMeuPainel(dateRange: DateRange) {
  const session = useSession();
  const { role } = useAuth();

  const from = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : null;
  const to = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : from;

  return useQuery<MeuPainelData>({
    queryKey: ["meu-painel", from, to],
    enabled: !!session && role === "vendedor" && !!from && !!to,
    staleTime: 30_000,
    queryFn: async () => {
      // 1. Descobrir vendedor vinculado
      const { data: link } = await supabase
        .from("vendedor_users")
        .select("vendedor_id, vendedores:vendedor_id(id, nome_vendedor)")
        .maybeSingle();

      const vendedorId = (link as any)?.vendedor_id ?? null;
      const vendedorNome = (link as any)?.vendedores?.nome_vendedor ?? null;

      if (!vendedorId) {
        return { vendedorId: null, vendedorNome: null, carregamentos: [] };
      }

      // 2. Pedidos do vendedor no intervalo (RLS já restringe por vendedor_id, mas filtramos por data)
      let all: any[] = [];
      let cursor = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("carregamentos_dia")
          .select("*")
          .gte("data", from!)
          .lte("data", to!)
          .order("data", { ascending: false })
          .range(cursor, cursor + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE) break;
        cursor += PAGE;
      }

      return { vendedorId, vendedorNome, carregamentos: all };
    },
  });
}