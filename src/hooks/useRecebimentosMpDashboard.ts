import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import type { RecebimentoMp } from "@/hooks/useRecebimentosMp";

export type DashboardRangePreset = "7" | "30" | "90";

export type DashboardAgg = {
  totalDescargas: number;
  totalTon: number;
  totalValor: number;
  valorPago: number;
  valorPendente: number;
  ticketMedio: number;
  palletsPendentes: number;
  serieDiaria: Array<{ dia: string; ton: number; valor: number }>;
  topFornecedores: Array<{ nome: string; ton: number; valor: number }>;
  topMotoristas: Array<{ nome: string; entregas: number; ton: number }>;
  pagamentoStatus: { pago: number; pendente: number };
};

export function useRecebimentosMpDashboard(preset: DashboardRangePreset = "30") {
  const session = useSession();
  return useQuery({
    queryKey: ["recebimentos_mp_dashboard", preset],
    enabled: !!session,
    queryFn: async (): Promise<DashboardAgg> => {
      const days = Number(preset);
      const de = new Date(); de.setDate(de.getDate() - days);
      const deISO = de.toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("mp_recebimentos")
        .select("*")
        .gte("data_chegada", deISO)
        .order("data_chegada", { ascending: true })
        .limit(5000);
      if (error) throw error;
      const rows = (data ?? []) as RecebimentoMp[];

      const out: DashboardAgg = {
        totalDescargas: rows.length,
        totalTon: 0,
        totalValor: 0,
        valorPago: 0,
        valorPendente: 0,
        ticketMedio: 0,
        palletsPendentes: 0,
        serieDiaria: [],
        topFornecedores: [],
        topMotoristas: [],
        pagamentoStatus: { pago: 0, pendente: 0 },
      };

      const diaMap = new Map<string, { ton: number; valor: number }>();
      const fornMap = new Map<string, { ton: number; valor: number }>();
      const motMap = new Map<string, { entregas: number; ton: number }>();

      for (const r of rows) {
        const ton = Number(r.peso_total_ton ?? 0);
        const valor = Number(r.valor_total ?? 0);
        out.totalTon += ton;
        out.totalValor += valor;
        if (r.pagamento_status === "pago") { out.valorPago += valor; out.pagamentoStatus.pago++; }
        else { out.valorPendente += valor; out.pagamentoStatus.pendente++; }
        if (r.pallets_quantidade && !r.pallets_devolvidos) out.palletsPendentes += r.pallets_quantidade;

        const d = r.data_chegada;
        const cur = diaMap.get(d) ?? { ton: 0, valor: 0 };
        cur.ton += ton; cur.valor += valor; diaMap.set(d, cur);

        if (r.fornecedor_nome) {
          const f = fornMap.get(r.fornecedor_nome) ?? { ton: 0, valor: 0 };
          f.ton += ton; f.valor += valor; fornMap.set(r.fornecedor_nome, f);
        }
        if (r.motorista) {
          const m = motMap.get(r.motorista) ?? { entregas: 0, ton: 0 };
          m.entregas++; m.ton += ton; motMap.set(r.motorista, m);
        }
      }

      out.ticketMedio = out.totalDescargas > 0 ? out.totalValor / out.totalDescargas : 0;
      out.serieDiaria = Array.from(diaMap.entries()).map(([dia, v]) => ({ dia, ...v })).sort((a, b) => a.dia.localeCompare(b.dia));
      out.topFornecedores = Array.from(fornMap.entries()).map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.ton - a.ton).slice(0, 5);
      out.topMotoristas = Array.from(motMap.entries()).map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.entregas - a.entregas).slice(0, 5);

      return out;
    },
    staleTime: 60_000,
  });
}