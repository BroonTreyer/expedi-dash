import { useEffect } from "react";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
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
  status: string | null; // status agregado (Carregado se TODOS os itens estão Carregado)
}

/**
 * Cargas terceirizadas da data informada, agregadas por carga_id.
 * Mesma lógica de peso usada no Consolidado: pesoEfetivo (rupturas totais = 0).
 * Inclui carry-over de cargas dos últimos 30 dias com status != "Carregado"
 * quando a data for hoje (igual ao Consolidado).
 */
export function useCargasDiaExpedicao(dateStr: string) {
  const session = useSession();
  const queryClient = useQueryClient();

  // Realtime: qualquer alteração em carregamentos_dia atualiza o painel
  // (KPIs de peso, "Cargas expedidas do dia") em ~1s.
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`cargas-dia-expedicao-${dateStr}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carregamentos_dia" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cargas_dia_expedicao"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateStr, session, queryClient]);

  return useQuery({
    queryKey: ["cargas_dia_expedicao", dateStr],
    enabled: !!session,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    retry: 2,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carregamentos_dia")
        .select("carga_id, nome_carga, placa, motorista, transportadora, tipo_caminhao, peso, ruptura, data, numero_pedido, status")
        .not("carga_id", "is", null)
        .eq("data", dateStr);
      if (error) throw error;
      // Sem carry-over: KPIs do painel Expedição refletem apenas as cargas
      // com data = dia selecionado. Cargas de outros dias com movimento hoje
      // aparecem nos painéis Pátio/Chegou (via movimentacoes_portaria), mas
      // não inflam o peso total do dia.
      const rows = (data ?? []) as any[];

      const grouped = new Map<string, CargaDiaExpedicao & { pedidos: Set<number>; statuses: Set<string> }>();
      for (const r of rows) {
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
            status: null,
            statuses: new Set<string>(),
          };
          grouped.set(r.carga_id, g);
        }
        g.pesoTotal += pesoEfetivo({ peso: r.peso, ruptura: !!r.ruptura });
        if (r.numero_pedido != null) g.pedidos.add(Number(r.numero_pedido));
        if (r.status) g.statuses.add(String(r.status));
      }

      return Array.from(grouped.values()).map(({ pedidos, statuses, ...rest }) => ({
        ...rest,
        qtdPedidos: pedidos.size,
        // status agregado: "Carregado" só se todos os itens da carga estão Carregado
        status:
          statuses.size === 1
            ? Array.from(statuses)[0]
            : statuses.has("Carregando")
              ? "Carregando"
              : statuses.size > 0
                ? Array.from(statuses)[0]
                : null,
      })) as CargaDiaExpedicao[];
    },
  });
}
