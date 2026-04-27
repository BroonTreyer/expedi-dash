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

  return useMeuPainelInternal(dateRange, undefined);
}

/** Variante para Admin visualizar o painel de um vendedor específico. */
export function useMeuPainelAdmin(dateRange: DateRange, vendedorId: string | null) {
  return useMeuPainelInternal(dateRange, vendedorId);
}

function useMeuPainelInternal(dateRange: DateRange, override: string | null | undefined) {
  const session = useSession();
  const { role } = useAuth();

  const isAdminView = override !== undefined;
  const from = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : null;
  const to = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : from;

  return useQuery<MeuPainelData>({
    queryKey: ["meu-painel", isAdminView ? `admin:${override ?? ""}` : "self", from, to],
    enabled: !!session && !!from && !!to && (
      isAdminView ? (role === "admin" && !!override) : role === "vendedor"
    ),
    staleTime: 30_000,
    queryFn: async () => {
      let vendedorId: string | null = null;
      let vendedorNome: string | null = null;

      if (isAdminView) {
        vendedorId = override ?? null;
        if (vendedorId) {
          const { data: v } = await supabase
            .from("vendedores")
            .select("nome_vendedor")
            .eq("id", vendedorId)
            .maybeSingle();
          vendedorNome = (v as any)?.nome_vendedor ?? null;
        }
      } else {
        const { data: link } = await supabase
          .from("vendedor_users")
          .select("vendedor_id, vendedores:vendedor_id(id, nome_vendedor)")
          .maybeSingle();
        vendedorId = (link as any)?.vendedor_id ?? null;
        vendedorNome = (link as any)?.vendedores?.nome_vendedor ?? null;
      }

      if (!vendedorId) {
        return { vendedorId: null, vendedorNome: null, carregamentos: [] };
      }

      // Admin não tem RLS de vendedor, precisa filtrar manualmente; vendedor já é restrito por RLS.
      let all: any[] = [];
      let cursor = 0;
      const PAGE = 1000;
      while (true) {
        let q = supabase
          .from("carregamentos_dia")
          .select("*")
          .gte("data", from!)
          .lte("data", to!)
          .order("data", { ascending: false })
          .range(cursor, cursor + PAGE - 1);
        if (isAdminView) q = q.eq("vendedor_id", vendedorId);
        const { data, error } = await q;
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