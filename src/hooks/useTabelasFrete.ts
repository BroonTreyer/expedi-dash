import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import { toast } from "sonner";

export type TabelaFrete = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
};

export type TabelaFreteItem = {
  id: string;
  tabela_id: string;
  codigo_cliente: string | null;
  destino_cidade: string | null;
  destino_uf: string;
  valor_kg_bitruck: number;
  valor_kg_carreta: number;
  ativo: boolean;
};

export type VendedorTabelaLink = { vendedor_id: string; tabela_id: string };

const TF = "tabelas_frete" as const;
const TFI = "tabelas_frete_itens" as const;
const VTF = "vendedor_tabelas_frete" as const;

export function useTabelasFrete() {
  const session = useSession();
  return useQuery({
    queryKey: ["tabelas_frete"],
    enabled: !!session,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from(TF).select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as TabelaFrete[];
    },
  });
}

export function useTabelaFreteItens(tabelaId: string | null) {
  const session = useSession();
  return useQuery({
    queryKey: ["tabelas_frete_itens", tabelaId],
    enabled: !!session && !!tabelaId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TFI).select("*").eq("tabela_id", tabelaId).order("destino_uf").order("destino_cidade");
      if (error) throw error;
      const rows = (data ?? []) as TabelaFreteItem[];
      // Linhas "UF inteira" (cidade null) ficam no topo de cada UF
      return rows.slice().sort((a, b) => {
        if (a.destino_uf !== b.destino_uf) return a.destino_uf.localeCompare(b.destino_uf);
        const ac = a.destino_cidade ?? "";
        const bc = b.destino_cidade ?? "";
        if (!ac && bc) return -1;
        if (ac && !bc) return 1;
        return ac.localeCompare(bc);
      });
    },
  });
}

export function useVendedoresPorTabela(tabelaId: string | null) {
  const session = useSession();
  return useQuery({
    queryKey: ["vendedor_tabelas_frete", tabelaId],
    enabled: !!session && !!tabelaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(VTF).select("vendedor_id, tabela_id").eq("tabela_id", tabelaId);
      if (error) throw error;
      return (data ?? []) as VendedorTabelaLink[];
    },
  });
}

export function useTabelasContagens() {
  const session = useSession();
  return useQuery({
    queryKey: ["tabelas_frete_contagens"],
    enabled: !!session,
    staleTime: 30_000,
    queryFn: async () => {
      const [itens, vinc] = await Promise.all([
        (supabase as any).from(TFI).select("tabela_id"),
        (supabase as any).from(VTF).select("tabela_id"),
      ]);
      const ic = new Map<string, number>();
      const vc = new Map<string, number>();
      for (const r of itens.data ?? []) ic.set(r.tabela_id, (ic.get(r.tabela_id) ?? 0) + 1);
      for (const r of vinc.data ?? []) vc.set(r.tabela_id, (vc.get(r.tabela_id) ?? 0) + 1);
      return { itens: ic, vendedores: vc };
    },
  });
}

export function useCriarTabela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome: string; descricao?: string }) => {
      const { data, error } = await (supabase as any).from(TF).insert(input).select().single();
      if (error) throw error;
      return data as TabelaFrete;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tabelas_frete"] }); toast.success("Tabela criada"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useAtualizarTabela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; nome?: string; descricao?: string | null; ativo?: boolean }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from(TF).update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tabelas_frete"] }),
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useExcluirTabela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(TF).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tabelas_frete"] });
      qc.invalidateQueries({ queryKey: ["tabelas_frete_contagens"] });
      toast.success("Tabela excluída");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useUpsertItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<TabelaFreteItem> & {
      tabela_id: string; destino_uf: string; destino_cidade?: string | null;
    }) => {
      const cidadeRaw = (row.destino_cidade ?? "");
      const cidade = (typeof cidadeRaw === "string" ? cidadeRaw.trim() : "") || null;
      const payload = {
        id: row.id,
        tabela_id: row.tabela_id,
        codigo_cliente: row.codigo_cliente?.trim() ? row.codigo_cliente.trim() : null,
        destino_cidade: cidade,
        destino_uf: row.destino_uf.trim().toUpperCase().slice(0, 2),
        valor_kg_bitruck: Number(row.valor_kg_bitruck) || 0,
        valor_kg_carreta: Number(row.valor_kg_carreta) || 0,
        ativo: row.ativo ?? true,
      };
      const { data, error } = await (supabase as any)
        .from(TFI).upsert(payload, { onConflict: "id" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tabelas_frete_itens", vars.tabela_id] });
      qc.invalidateQueries({ queryKey: ["tabelas_frete_contagens"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

export function useExcluirItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; tabela_id: string }) => {
      const { error } = await (supabase as any).from(TFI).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tabelas_frete_itens", vars.tabela_id] });
      qc.invalidateQueries({ queryKey: ["tabelas_frete_contagens"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}

export function useVincularVendedores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tabela_id, vendedorIds }: { tabela_id: string; vendedorIds: string[] }) => {
      // Substitui os vínculos da tabela
      const { error: delErr } = await (supabase as any).from(VTF).delete().eq("tabela_id", tabela_id);
      if (delErr) throw delErr;
      if (vendedorIds.length > 0) {
        const rows = vendedorIds.map((vid) => ({ tabela_id, vendedor_id: vid }));
        const { error } = await (supabase as any).from(VTF).insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["vendedor_tabelas_frete", vars.tabela_id] });
      qc.invalidateQueries({ queryKey: ["tabelas_frete_contagens"] });
      toast.success("Vínculos atualizados");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
}