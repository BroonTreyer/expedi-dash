import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EditItemPayload {
  id?: string; // existente
  codigo_produto: string;
  nome_produto: string;
  quantidade: number;
  peso: number;
  preco_unitario: number;
  preco_total: number;
  motivo_ruptura?: string | null;
  ruptura?: boolean;
}

interface EditarPedidoPayload {
  // Identidade do grupo (para novos itens)
  vendedor_id: string;
  data: string; // yyyy-mm-dd
  numero_pedido: number;
  codigo_cliente: string | null;
  cliente: string | null;
  cidade: string | null;
  uf: string | null;
  observacoes: string;
  forma_pagamento?: string | null;
  items: EditItemPayload[];
  removedIds: string[];
  aprovarAposSalvar?: boolean;
}

export function useEditarPedidoAprovacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EditarPedidoPayload) => {
      const { items, removedIds, aprovarAposSalvar, ...meta } = payload;
      const operationId = crypto.randomUUID();

      // 1) DELETE removidos
      if (removedIds.length) {
        const { error } = await supabase
          .from("carregamentos_dia")
          .delete()
          .in("id", removedIds);
        if (error) throw error;
      }

      // 2) UPDATE existentes
      const updates = items.filter((i) => i.id);
      for (const it of updates) {
        // Se a ruptura foi desmarcada e o peso voltou ao original, limpa também
        // o flag persistente "ruptura_sinalizada" (defensivo — o trigger DB também faz).
        const limparSinalizada = !it.ruptura;
        const { error } = await supabase
          .from("carregamentos_dia")
          .update({
            codigo_produto: it.codigo_produto,
            nome_produto: it.nome_produto,
            quantidade: it.quantidade,
            peso: it.peso,
            peso_manual: true,
            preco_unitario: it.preco_unitario || null,
            preco_total: it.preco_total || null,
            motivo_ruptura: it.motivo_ruptura || null,
            ruptura: !!it.ruptura,
            ...(limparSinalizada ? { ruptura_sinalizada: false } : {}),
            observacoes: meta.observacoes || null,
            forma_pagamento: meta.forma_pagamento || null,
            ...(aprovarAposSalvar ? { etapa: "vendas", status: "Aguardando" } : {}),
          })
          .eq("id", it.id!);
        if (error) throw error;
      }

      // 3) INSERT novos
      const novos = items.filter((i) => !i.id);
      if (novos.length) {
        const rows = novos.map((it, idx) => ({
          vendedor_id: meta.vendedor_id,
          data: meta.data,
          numero_pedido: meta.numero_pedido,
          codigo_cliente: meta.codigo_cliente,
          cliente: meta.cliente,
          cidade: meta.cidade,
          uf: meta.uf,
          codigo_produto: it.codigo_produto,
          nome_produto: it.nome_produto,
          quantidade: it.quantidade,
          peso: it.peso,
          peso_manual: true,
          preco_unitario: it.preco_unitario || null,
          preco_total: it.preco_total || null,
          motivo_ruptura: it.motivo_ruptura || null,
          ruptura: !!it.ruptura,
          observacoes: meta.observacoes || null,
          forma_pagamento: meta.forma_pagamento || null,
          etapa: aprovarAposSalvar ? "vendas" : "aguardando_faturamento",
          status: "Aguardando",
          operation_id: operationId,
          // Chave única por linha: bloqueia o MESMO envio repetido,
          // mas permite legitimamente o mesmo produto duas vezes se o usuário quiser.
          row_op_key: `${operationId}__novo__${idx}`,
        }));
        const { error } = await supabase.from("carregamentos_dia").insert(rows);
        // 23505 = unique violation => mesmo operation_id já gravado (duplo clique).
        // Tratamos como sucesso silencioso para garantir idempotência.
        if (error && (error as any).code !== "23505") throw error;
      }

      // 4) Audit log agregado
      try {
        await supabase.rpc("log_audit", {
          _entity_type: "carregamento",
          _entity_id: String(meta.numero_pedido),
          _action: aprovarAposSalvar ? "editado_e_aprovado" : "editado_em_aprovacao",
          _changes: {
            cliente: meta.cliente,
            numero_pedido: meta.numero_pedido,
            itens_atualizados: updates.length,
            itens_inseridos: novos.length,
            itens_removidos: removedIds.length,
          } as any,
          _operation_id: operationId,
          _logical_entity_type: "pedido",
          _logical_entity_id: `${meta.vendedor_id}:${meta.data}:${meta.numero_pedido}`,
        } as any);
      } catch {
        // não-crítico
      }

      return { updated: updates.length, inserted: novos.length, removed: removedIds.length };
    },
    onSuccess: (r, vars) => {
      toast.success(
        vars.aprovarAposSalvar
          ? "Pedido editado e aprovado"
          : `Pedido atualizado (${r.updated + r.inserted} item(ns))`
      );
      qc.invalidateQueries({ queryKey: ["aprovacoes-pendentes"] });
      qc.invalidateQueries({ queryKey: ["aprovacoes-pendentes-count"] });
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      qc.invalidateQueries({ queryKey: ["meu-painel"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar edição"),
  });
}