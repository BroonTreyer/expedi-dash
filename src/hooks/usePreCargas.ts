import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { fetchAllPaginated } from "@/lib/supabase-paginate";
import type { Carregamento } from "@/hooks/useCarregamentos";

/**
 * Carrega TODAS as linhas de carregamentos_dia com etapa = 'pre_carga'
 * (sem filtro de data). A página de Pré-cargas precisa de visão completa.
 * Inclui realtime básico — qualquer mudança em carregamentos_dia invalida o cache.
 */
export function usePreCargas() {
  const session = useSession();
  const qc = useQueryClient();

  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel("pre-cargas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carregamentos_dia" },
        () => qc.invalidateQueries({ queryKey: ["pre-cargas"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, qc]);

  return useQuery({
    queryKey: ["pre-cargas"],
    enabled: !!session,
    queryFn: async () => {
      const rows = await fetchAllPaginated<any>((from, to) =>
        supabase
          .from("carregamentos_dia")
          .select("*, vendedores(nome_vendedor)")
          .eq("etapa", "pre_carga")
          .order("data", { ascending: false })
          .order("carga_id", { ascending: true })
          .order("numero_pedido", { ascending: true })
          .range(from, to),
      );
      return rows as (Carregamento & { ruptura_sinalizada?: boolean; forma_pagamento?: string | null })[];
    },
    staleTime: 30_000,
  });
}

/**
 * Atualiza a "Data prevista de carregamento" de uma pré-carga (mesmo carga_id).
 *
 * IMPORTANTE: este campo é PURAMENTE INFORMATIVO (controle interno do
 * Faturamento). Ele grava em `data_prevista_carregamento` e NÃO toca em
 * `data`, então não afeta filtros do Painel, Rupturas, Consolidado, etc.
 */
export function useAtualizarDataCarga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cargaId, novaData }: { cargaId: string; novaData: string }) => {
      const { error } = await supabase
        .from("carregamentos_dia")
        .update({ data_prevista_carregamento: novaData })
        .eq("carga_id", cargaId);
      if (error) throw error;
      return { cargaId, novaData };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pre-cargas"] });
    },
  });
}

/**
 * Remove um pedido individual de uma pré-carga.
 * O pedido volta para etapa "aguardando_faturamento" e fica disponível
 * para ser incluído em outra carga. Todos os campos de transporte são
 * limpos. Não exclui registros do banco.
 */
export function useRemoverPedidoPreCarga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      cargaId: string;
      numeroPedido: number;
      codigoCliente: string | null;
      cliente: string | null;
    }) => {
      let q = supabase
        .from("carregamentos_dia")
        .update({
          etapa: "aguardando_faturamento",
          carga_id: null,
          nome_carga: null,
          placa: null,
          motorista: null,
          transportadora: null,
          tipo_caminhao: null,
          ordem_carga: null,
          data_prevista_carregamento: null,
        })
        .eq("carga_id", args.cargaId)
        .eq("numero_pedido", args.numeroPedido);
      if (args.codigoCliente) {
        q = q.eq("codigo_cliente", args.codigoCliente);
      } else if (args.cliente) {
        q = q.eq("cliente", args.cliente);
      }
      const { error } = await q;
      if (error) throw error;
      return args;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pre-cargas"] });
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      qc.invalidateQueries({ queryKey: ["aprovacoes-pendentes"] });
      qc.invalidateQueries({ queryKey: ["aprovacoes-pendentes-count"] });
    },
  });
}