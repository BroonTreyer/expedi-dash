import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useEffect } from "react";

export type RecebimentoMp = {
  id: string;
  recibo_numero: string | null;
  data_chegada: string;
  hora_chegada: string | null;
  data_recebimento: string | null;
  data_descarga: string | null;
  motorista: string | null;
  telefone: string | null;
  cpf: string | null;
  placa: string | null;
  tipo_veiculo: string | null;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  conferente: string | null;
  doca_setor: string | null;
  pallets_quantidade: number | null;
  pallets_devolvidos: boolean;
  peso_total_ton: number;
  valor_tonelada: number;
  valor_total: number;
  forma_pagamento: string | null;
  pagamento_status: "pendente" | "pago";
  pago_em: string | null;
  pago_por: string | null;
  comprovante_url: string | null;
  foto_nota_url: string | null;
  status_geral: "aguardando_descarga" | "descarregando" | "aguardando_pagamento" | "pago" | "liberado" | "cancelado";
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type RecebimentoMpItem = {
  id: string;
  recebimento_id: string;
  produto_id: string | null;
  nome_produto: string;
  nota_fiscal: string | null;
  peso_ton: number;
  valor_unitario: number;
  valor_total_linha: number;
  ordem: number | null;
};

const TABLE = "recebimentos_mp" as const;
const TABLE_ITENS = "recebimentos_mp_itens" as const;

export function useRecebimentosMp(dataISO?: string) {
  const session = useSession();
  const qc = useQueryClient();

  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel("recebimentos_mp_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => {
        qc.invalidateQueries({ queryKey: ["recebimentos_mp"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE_ITENS }, () => {
        qc.invalidateQueries({ queryKey: ["recebimentos_mp"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, qc]);

  return useQuery({
    queryKey: ["recebimentos_mp", dataISO ?? "all"],
    enabled: !!session,
    queryFn: async () => {
      let q = (supabase as any).from(TABLE).select("*").order("created_at", { ascending: false }).limit(500);
      if (dataISO) q = q.eq("data_chegada", dataISO);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RecebimentoMp[];
    },
    staleTime: 10_000,
  });
}

export function useRecebimentoMpItens(recebimentoId?: string | null) {
  const session = useSession();
  return useQuery({
    queryKey: ["recebimentos_mp_itens", recebimentoId],
    enabled: !!session && !!recebimentoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE_ITENS)
        .select("*")
        .eq("recebimento_id", recebimentoId)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RecebimentoMpItem[];
    },
  });
}

export function useCreateRecebimentoMp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<RecebimentoMp>) => {
      const { data: u } = await supabase.auth.getUser();
      const payload: any = { ...row, criado_por: u.user?.id };
      const { data, error } = await (supabase as any).from(TABLE).insert(payload).select().single();
      if (error) throw error;
      return data as RecebimentoMp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recebimentos_mp"] });
      toast.success("Chegada registrada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar"),
  });
}

export function useUpdateRecebimentoMp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<RecebimentoMp> & { id: string }) => {
      const { data, error } = await (supabase as any).from(TABLE).update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data as RecebimentoMp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recebimentos_mp"] });
      toast.success("Atualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
  });
}

export function useDeleteRecebimentoMp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from(TABLE_ITENS).delete().eq("recebimento_id", id);
      const { error } = await (supabase as any).from(TABLE).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recebimentos_mp"] });
      toast.success("Removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
}

export function useSaveRecebimentoMpItens() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recebimentoId, itens }: { recebimentoId: string; itens: Array<Partial<RecebimentoMpItem>> }) => {
      // Strategy: delete all + insert (small N, simple consistency)
      await (supabase as any).from(TABLE_ITENS).delete().eq("recebimento_id", recebimentoId);
      if (itens.length === 0) return;
      const payload = itens.map((it, idx) => ({
        recebimento_id: recebimentoId,
        produto_id: it.produto_id ?? null,
        nome_produto: it.nome_produto ?? "",
        nota_fiscal: it.nota_fiscal ?? null,
        peso_ton: Number(it.peso_ton ?? 0),
        valor_unitario: Number(it.valor_unitario ?? 35),
        ordem: idx,
      }));
      const { error } = await (supabase as any).from(TABLE_ITENS).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recebimentos_mp"] });
      qc.invalidateQueries({ queryKey: ["recebimentos_mp_itens"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar itens"),
  });
}

export async function uploadRecebimentoMpFile(file: File, recebimentoId: string, kind: "nota" | "comprovante") {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${recebimentoId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("recebimento-mp").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = await supabase.storage.from("recebimento-mp").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? null;
}
