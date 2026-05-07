import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PrecoCombustivel {
  uf: string;
  tipo: string;
  valor_litro: number;
  fonte: string;
  atualizado_em: string;
  fromCache?: boolean;
}

export function useCombustivelPreco(uf: string = "GO", tipo: string = "diesel_s10") {
  return useQuery({
    queryKey: ["combustivel_preco", uf, tipo],
    queryFn: async (): Promise<PrecoCombustivel | null> => {
      const url = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/combustivel-preco?uf=${encodeURIComponent(uf)}&tipo=${encodeURIComponent(tipo)}`;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY } });
      if (!res.ok) return null;
      return (await res.json()) as PrecoCombustivel;
    },
    staleTime: 1000 * 60 * 60 * 6, // 6h
    enabled: !!uf,
  });
}

/** Calcula custo de combustível (R$) dado km, consumo (km/L) e preço (R$/L). */
export function calcularCustoCombustivel(km: number, kmPorLitro: number, valorLitro: number): number | null {
  if (!km || !kmPorLitro || kmPorLitro <= 0 || !valorLitro || valorLitro <= 0) return null;
  return (km / kmPorLitro) * valorLitro;
}