import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

export interface PedidoDistribuidor {
  id: string;
  numero_pedido: number | null;
  cliente: string | null;
  codigo_cliente: string | null;
  cidade: string | null;
  uf: string | null;
  data: string;
  created_at: string;
  carga_id: string | null;
  nome_carga: string | null;
  etapa: string;
  status: string;
  nome_produto: string | null;
  ruptura: boolean;
  horario_chegada: string | null;
  horario_entrada: string | null;
  horario_real_saida: string | null;
  horario_saida_final: string | null;
}

export interface DistribuidorAgrupado {
  codigo_cliente: string;
  nome_cliente: string;
  cidade: string | null;
  uf: string | null;
  pedidos: PedidoDistribuidor[];
}

/** Lista distribuidores + pedidos dos últimos `dias` dias. */
export function useDistribuidores(dias = 45) {
  const session = useSession();
  return useQuery({
    queryKey: ["distribuidores", dias],
    enabled: !!session,
    staleTime: 30_000,
    queryFn: async () => {
      // 1. clientes do tipo distribuidor
      const { data: clientes, error: errC } = await supabase
        .from("clientes")
        .select("codigo_cliente, nome_cliente, cidade, uf, tipo")
        .eq("tipo", "distribuidor")
        .order("nome_cliente");
      if (errC) throw errC;
      if (!clientes || clientes.length === 0)
        return { distribuidores: [] as DistribuidorAgrupado[], pedidos: [] as PedidoDistribuidor[] };

      const codigos = Array.from(
        new Set(clientes.map((c: any) => c.codigo_cliente).filter(Boolean))
      );
      if (codigos.length === 0)
        return { distribuidores: [], pedidos: [] };

      // 2. pedidos desses clientes no período
      const dataLimite = new Date(Date.now() - dias * 86400000)
        .toISOString()
        .slice(0, 10);

      let pedidos: any[] = [];
      // chunks de 200 códigos
      for (let i = 0; i < codigos.length; i += 200) {
        const chunk = codigos.slice(i, i + 200);
        const { data, error } = await supabase
          .from("carregamentos_dia")
          .select(
            "id, numero_pedido, cliente, codigo_cliente, cidade, uf, data, created_at, carga_id, nome_carga, etapa, status, nome_produto, ruptura"
          )
          .in("codigo_cliente", chunk)
          .gte("data", dataLimite)
          .order("data", { ascending: false });
        if (error) throw error;
        pedidos = pedidos.concat(data ?? []);
      }

      // 3. movimentações para os carga_id presentes
      const cargaIds = Array.from(
        new Set(pedidos.map((p) => p.carga_id).filter(Boolean))
      );
      const movsByCarga = new Map<string, any>();
      if (cargaIds.length > 0) {
        for (let i = 0; i < cargaIds.length; i += 200) {
          const chunk = cargaIds.slice(i, i + 200);
          const { data: movs, error: errM } = await supabase
            .from("movimentacoes_portaria")
            .select(
              "carga_id, horario_chegada, horario_entrada, horario_real_saida, horario_saida_final, data_hora"
            )
            .in("carga_id", chunk)
            .order("data_hora", { ascending: true });
          if (errM) throw errM;
          for (const m of movs ?? []) {
            if (!m.carga_id) continue;
            if (!movsByCarga.has(m.carga_id)) movsByCarga.set(m.carga_id, m);
          }
        }
      }

      const pedidosCompletos: PedidoDistribuidor[] = pedidos.map((p) => {
        const mov = p.carga_id ? movsByCarga.get(p.carga_id) : null;
        return {
          ...p,
          horario_chegada: mov?.horario_chegada ?? null,
          horario_entrada: mov?.horario_entrada ?? null,
          horario_real_saida: mov?.horario_real_saida ?? null,
          horario_saida_final: mov?.horario_saida_final ?? null,
        } as PedidoDistribuidor;
      });

      // 4. agrupa por código de cliente
      const grupos = new Map<string, DistribuidorAgrupado>();
      for (const c of clientes as any[]) {
        grupos.set(c.codigo_cliente, {
          codigo_cliente: c.codigo_cliente,
          nome_cliente: c.nome_cliente,
          cidade: c.cidade,
          uf: c.uf,
          pedidos: [],
        });
      }
      for (const p of pedidosCompletos) {
        if (!p.codigo_cliente) continue;
        const g = grupos.get(p.codigo_cliente);
        if (g) g.pedidos.push(p);
      }

      const distribuidores = Array.from(grupos.values()).sort((a, b) =>
        b.pedidos.length - a.pedidos.length || a.nome_cliente.localeCompare(b.nome_cliente)
      );

      return { distribuidores, pedidos: pedidosCompletos };
    },
  });
}

/** Util para marcar clientes como distribuidor em lote. */
export async function marcarComoDistribuidor(codigosCliente: string[], tipo: "distribuidor" | "varejo" | "outros") {
  if (codigosCliente.length === 0) return 0;
  const { error, count } = await supabase
    .from("clientes")
    .update({ tipo } as any, { count: "exact" })
    .in("codigo_cliente", codigosCliente);
  if (error) throw error;
  return count ?? 0;
}