import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { maskPhone } from "@/lib/masks";

const norm = (s: string | null | undefined) =>
  (s || "").trim().toUpperCase().replace(/\s+/g, " ");

/**
 * Carrega o cadastro de motoristas (nome + telefone) e devolve um helper
 * `getTelefone(nome)` que retorna o telefone formatado (máscara BR) ou null.
 * Usado para enriquecer telas/impressões que só guardam o nome do motorista.
 */
export function useTelefonesMotoristas() {
  const { session } = useAuth();
  const q = useQuery({
    queryKey: ["motoristas-telefones"],
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("motoristas")
        .select("nome_completo, telefone")
        .eq("ativo", true);
      if (error) throw error;
      const map = new Map<string, string>();
      for (const r of data || []) {
        const tel = (r.telefone || "").trim();
        if (!tel) continue;
        map.set(norm(r.nome_completo), maskPhone(tel));
      }
      return map;
    },
  });

  return useMemo(() => {
    const map = q.data ?? new Map<string, string>();
    return {
      isLoading: q.isLoading,
      getTelefone: (nome: string | null | undefined): string | null => {
        if (!nome) return null;
        return map.get(norm(nome)) ?? null;
      },
    };
  }, [q.data, q.isLoading]);
}