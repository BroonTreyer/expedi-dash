import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/useAuth";

export function useClientes() {
  const session = useSession();
  return useQuery({
    queryKey: ["clientes"],
    enabled: !!session,
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("clientes")
          .select("*")
          .order("nome_cliente")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        from += data.length;
      }
      return allData;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { codigo_cliente: string; nome_cliente: string; cidade?: string; uf?: string; cep?: string; ativo: boolean; tipo?: string }) => {
      const codigo = String(values.codigo_cliente ?? "").trim();
      const nome = String(values.nome_cliente ?? "").trim();
      if (!codigo) throw new Error("Código do cliente é obrigatório");
      if (!nome) throw new Error("Nome do cliente é obrigatório");

      // Confirma sessão ativa (evita falha silenciosa por RLS)
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        throw new Error("Sessão expirada. Faça login novamente para salvar o cliente.");
      }

      const normalized = { ...values, codigo_cliente: codigo, nome_cliente: nome };

      // Check for duplicate before inserting
      const { data: existing } = await supabase
        .from("clientes")
        .select("codigo_cliente, nome_cliente, cidade, uf")
        .eq("codigo_cliente", codigo)
        .maybeSingle();

      if (existing) {
        const info = [existing.nome_cliente, existing.cidade, existing.uf].filter(Boolean).join(" – ");
        // Loga tentativa duplicada para auditoria de "sumiços"
        try {
          await supabase.rpc("log_audit", {
            _entity_type: "cliente",
            _entity_id: codigo,
            _action: "tentativa_duplicada",
            _changes: { tentativa: normalized, existente: existing } as any,
          });
        } catch {}
        throw new Error(`Já existe um cliente com o código ${codigo}: ${info}`);
      }

      const { data, error } = await supabase.from("clientes").insert(normalized).select().single();
      if (error) {
        try {
          await supabase.rpc("log_audit", {
            _entity_type: "cliente",
            _entity_id: codigo,
            _action: "tentativa_falhou",
            _changes: { tentativa: normalized, erro: error.message } as any,
          });
        } catch {}
        throw error;
      }
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clientes"] }); toast.success("Cliente criado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; codigo_cliente: string; nome_cliente: string; cidade?: string; uf?: string; cep?: string; ativo: boolean; tipo?: string }) => {
      const { data, error } = await supabase.from("clientes").update(values).eq("id", id).select().single();
      if (error) throw error;

      // Propagar nome, cidade e UF para todos os pedidos com esse codigo_cliente
      await supabase
        .from("carregamentos_dia")
        .update({
          cliente: values.nome_cliente,
          cidade: values.cidade || null,
          uf: values.uf || null,
        })
        .eq("codigo_cliente", values.codigo_cliente);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["carregamentos"] });
      toast.success("Cliente atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clientes"] }); toast.success("Cliente excluído"); },
    onError: (e: any) => toast.error(e.message),
  });
}
