import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { montarTimelineDistribuidor } from "@/lib/timeline-utils";

/**
 * Carrega a linha do tempo de UM pedido (distribuidor).
 * `pedidoId` é o uuid de `carregamentos_dia.id`.
 */
export function useTimelinePedidoDistribuidor(pedidoId: string | null) {
  const session = useSession();
  return useQuery({
    queryKey: ["timeline-distribuidor", pedidoId],
    enabled: !!session && !!pedidoId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!pedidoId) return null;

      const { data: pedido, error: errP } = await supabase
        .from("carregamentos_dia")
        .select(
          "id, created_at, data, carga_id, codigo_cliente, cliente, numero_pedido, nome_produto, etapa, ruptura, ruptura_sinalizada"
        )
        .eq("id", pedidoId)
        .maybeSingle();
      if (errP) throw errP;
      if (!pedido) return null;

      const [audRes, movRes] = await Promise.all([
        supabase
          .from("audit_log")
          .select("created_at, changes, action, user_email")
          .eq("entity_type", "carregamento")
          .eq("entity_id", pedidoId)
          .order("created_at", { ascending: true }),
        pedido.carga_id
          ? supabase
              .from("movimentacoes_portaria")
              .select(
                "horario_chegada, horario_entrada, horario_real_saida, horario_saida_final, data_hora, placa, motorista"
              )
              .eq("carga_id", pedido.carga_id)
              .order("data_hora", { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (audRes.error) throw audRes.error;
      if ((movRes as any).error) throw (movRes as any).error;

      const built = montarTimelineDistribuidor({
        pedido,
        auditoria: (audRes.data ?? []) as any,
        movimentacoes: ((movRes as any).data ?? []) as any,
      });

      const movPrincipal = ((movRes as any).data ?? [])[0];

      return {
        pedido,
        ...built,
        veiculo: movPrincipal
          ? { placa: movPrincipal.placa, motorista: movPrincipal.motorista }
          : null,
      };
    },
  });
}