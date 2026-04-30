import { useQuery, keepPreviousData } from "@tanstack/react-query";
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
  return useQuery({
    queryKey: ["cargas_dia_expedicao", dateStr],
    enabled: !!session,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 2,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const isToday = dateStr === todayStr;

      const q = supabase
        .from("carregamentos_dia")
        .select("carga_id, nome_carga, placa, motorista, transportadora, tipo_caminhao, peso, ruptura, data, numero_pedido, status")
        .not("carga_id", "is", null)
        .eq("data", dateStr);

      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as any[];

      // Carry-over: quando dia é hoje, trazer também cargas com data < hoje
      // (até 30 dias atrás) que tiveram movimento de portaria registrado hoje
      // — assim cargas marcadas como "Carregado" hoje continuam aparecendo
      // mesmo que sua data oficial seja anterior.
      if (isToday) {
        const startOfDay = `${dateStr}T00:00:00`;
        const endOfDay = `${dateStr}T23:59:59.999`;
        const { data: movsHoje } = await supabase
          .from("movimentacoes_portaria")
          .select("carga_id")
          .not("carga_id", "is", null)
          .eq("categoria", "terceirizado")
          .gte("data_hora", startOfDay)
          .lte("data_hora", endOfDay);
        const cargaIdsHoje = Array.from(
          new Set(((movsHoje ?? []) as { carga_id: string | null }[])
            .map((m) => m.carga_id)
            .filter((v): v is string => !!v))
        );
        const jaPresentes = new Set(rows.map((r: any) => r.carga_id).filter(Boolean));
        const faltantes = cargaIdsHoje.filter((cid) => !jaPresentes.has(cid));
        if (faltantes.length > 0) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const limitDate = thirtyDaysAgo.toISOString().split("T")[0];
          const { data: extra } = await supabase
            .from("carregamentos_dia")
            .select("carga_id, nome_carga, placa, motorista, transportadora, tipo_caminhao, peso, ruptura, data, numero_pedido, status")
            .in("carga_id", faltantes)
            .lt("data", dateStr)
            .gte("data", limitDate);
          if (extra && extra.length > 0) {
            rows = [...rows, ...extra];
          }
        }
      }

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
