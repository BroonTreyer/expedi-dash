import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import type { RecebimentoMp } from "@/hooks/useRecebimentosMp";

export type MotoristaMpAgg = {
  chave: string; // CPF || placa || nome
  nome: string;
  cpf: string | null;
  telefone: string | null;
  placas: string[];
  fornecedores: string[];
  totalEntregas: number;
  totalTon: number;
  totalValor: number;
  ultimaVisita: string | null; // ISO
  recebimentos: RecebimentoMp[];
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toUpperCase();
}

export function useMotoristasMp() {
  const session = useSession();
  return useQuery({
    queryKey: ["motoristas_mp_agg"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mp_recebimentos")
        .select("*")
        .order("data_chegada", { ascending: false })
        .limit(5000);
      if (error) throw error;
      const rows = (data ?? []) as RecebimentoMp[];
      const map = new Map<string, MotoristaMpAgg>();
      for (const r of rows) {
        const nome = norm(r.motorista) || "—";
        if (nome === "—") continue;
        const chave = norm(r.cpf) || norm(r.placa) || nome;
        const cur = map.get(chave);
        if (cur) {
          cur.totalEntregas++;
          cur.totalTon += Number(r.peso_total_ton ?? 0);
          cur.totalValor += Number(r.valor_total ?? 0);
          if (r.placa && !cur.placas.includes(r.placa)) cur.placas.push(r.placa);
          if (r.fornecedor_nome && !cur.fornecedores.includes(r.fornecedor_nome)) cur.fornecedores.push(r.fornecedor_nome);
          if (!cur.ultimaVisita || (r.data_chegada > cur.ultimaVisita)) cur.ultimaVisita = r.data_chegada;
          cur.recebimentos.push(r);
        } else {
          map.set(chave, {
            chave,
            nome: r.motorista ?? "—",
            cpf: r.cpf,
            telefone: r.telefone,
            placas: r.placa ? [r.placa] : [],
            fornecedores: r.fornecedor_nome ? [r.fornecedor_nome] : [],
            totalEntregas: 1,
            totalTon: Number(r.peso_total_ton ?? 0),
            totalValor: Number(r.valor_total ?? 0),
            ultimaVisita: r.data_chegada,
            recebimentos: [r],
          });
        }
      }
      return Array.from(map.values()).sort((a, b) => b.totalEntregas - a.totalEntregas);
    },
    staleTime: 30_000,
  });
}