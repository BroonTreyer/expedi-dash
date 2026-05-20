import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { toast } from "sonner";

export type FechamentoFornecedorRow = {
  mes: string; fornecedor_id: string | null; fornecedor_nome: string;
  qtd_recebimentos: number; ton: number; valor: number; valor_pago: number; valor_pendente: number;
};

export function useMpFechamentoMensal(mesISO: string) {
  const session = useSession();
  return useQuery({
    queryKey: ["mp_fechamento", mesISO],
    enabled: !!session && !!mesISO,
    queryFn: async () => {
      const [agg, recs] = await Promise.all([
        (supabase as any).from("mp_fechamento_fornecedor").select("*").eq("mes", mesISO),
        (supabase as any).from("mp_recebimentos")
          .select("id,peso_total_ton,valor_total,pagamento_status,mes_fechado")
          .gte("data_chegada", mesISO.slice(0, 7) + "-01")
          .lt("data_chegada", nextMonth(mesISO).slice(0, 7) + "-01"),
      ]);
      if (agg.error) throw agg.error;
      if (recs.error) throw recs.error;
      const rows = (agg.data ?? []) as FechamentoFornecedorRow[];
      const r = (recs.data ?? []) as any[];
      const totals = {
        ton: r.reduce((a, b) => a + Number(b.peso_total_ton ?? 0), 0),
        valor: r.reduce((a, b) => a + Number(b.valor_total ?? 0), 0),
        qtd: r.length,
        pago: r.filter((x) => x.pagamento_status === "pago").reduce((a, b) => a + Number(b.valor_total ?? 0), 0),
        pendente: r.filter((x) => x.pagamento_status !== "pago").reduce((a, b) => a + Number(b.valor_total ?? 0), 0),
        fechado: r.length > 0 && r.every((x) => x.mes_fechado),
      };
      return { fornecedores: rows, totals };
    },
    staleTime: 30_000,
  });
}

function nextMonth(mesISO: string): string {
  const d = new Date(mesISO.slice(0, 7) + "-01"); d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function useFecharMes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mesISO: string) => {
      const inicio = mesISO.slice(0, 7) + "-01";
      const fim = nextMonth(mesISO).slice(0, 7) + "-01";
      const { error } = await (supabase as any)
        .from("mp_recebimentos")
        .update({ mes_fechado: true })
        .gte("data_chegada", inicio)
        .lt("data_chegada", fim);
      if (error) throw error;
    },
    onSuccess: (_d, mesISO) => {
      qc.invalidateQueries({ queryKey: ["mp_fechamento", mesISO] });
      qc.invalidateQueries({ queryKey: ["recebimentos_mp"] });
      toast.success("Mês fechado. Edições agora estão bloqueadas.");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao fechar mês"),
  });
}

export function useReabrirMes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mesISO: string) => {
      const inicio = mesISO.slice(0, 7) + "-01";
      const fim = nextMonth(mesISO).slice(0, 7) + "-01";
      const { error } = await (supabase as any)
        .from("mp_recebimentos")
        .update({ mes_fechado: false })
        .gte("data_chegada", inicio)
        .lt("data_chegada", fim);
      if (error) throw error;
    },
    onSuccess: (_d, mesISO) => {
      qc.invalidateQueries({ queryKey: ["mp_fechamento", mesISO] });
      qc.invalidateQueries({ queryKey: ["recebimentos_mp"] });
      toast.success("Mês reaberto");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao reabrir"),
  });
}