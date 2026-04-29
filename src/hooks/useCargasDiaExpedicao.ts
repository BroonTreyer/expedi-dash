import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { pesoEfetivo } from "@/lib/peso-utils";

export interface CargaDiaExpedicao {
  carga_id: string;
  nome_carga: string | null;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  tipo_caminhao: string | null;
  data: string;
  pesoTotal: number; // soma de pesoEfetivo (descarta rupturas totais)
  qtdPedidos: number;
}

/**
 * Cargas terceirizadas da data informada, agregadas por carga_id.
 * Mesma lógica de peso usada no Consolidado: pesoEfetivo (rupturas totais = 0).
 * Inclui carry-over de cargas dos últimos 30 dias com status != "Carregado"
 * quando a data for hoje (igual ao Consolidado).
 */
export function useCargasDiaExpedicao(dateStr: string) {
  const session = useSession();
  return useQuery({
    queryKey: ["cargas_dia_expedicao", dateStr],
    enabled: !!session,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      let q = supabase
        .from("carregamentos_dia")
        .select("carga_id, nome_carga, placa, motorista, transportadora, tipo_caminhao, peso, ruptura, data, numero_pedido, status")
        .not("carga_id", "is", null);

      if (dateStr === todayStr) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const limitDate = thirtyDaysAgo.toISOString().split("T")[0];
        q = q.or(
          `data.eq.${dateStr},and(data.lt.${dateStr},data.gte.${limitDate},status.neq.Carregado)`
        );
      } else {
        q = q.eq("data", dateStr);
      }

      const { data, error } = await q;
      if (error) throw error;

      const grouped = new Map<string, CargaDiaExpedicao & { pedidos: Set<number> }>();
      for (const r of (data ?? []) as any[]) {
        if (!r.carga_id) continue;
        // Apenas terceirizado: tem transportadora preenchida
        if (!r.transportadora) continue;
        let g = grouped.get(r.carga_id);
        if (!g) {
          g = {
            carga_id: r.carga_id,
            nome_carga: r.nome_carga,
            placa: r.placa,
            motorista: r.motorista,
            transportadora: r.transportadora,
            tipo_caminhao: r.tipo_caminhao,
            data: r.data,
            pesoTotal: 0,
            qtdPedidos: 0,
            pedidos: new Set<number>(),
          };
          grouped.set(r.carga_id, g);
        }
        g.pesoTotal += pesoEfetivo({ peso: r.peso, ruptura: !!r.ruptura });
        if (r.numero_pedido != null) g.pedidos.add(Number(r.numero_pedido));
      }

      return Array.from(grouped.values()).map(({ pedidos, ...rest }) => ({
        ...rest,
        qtdPedidos: pedidos.size,
      })) as CargaDiaExpedicao[];
    },
  });
}
