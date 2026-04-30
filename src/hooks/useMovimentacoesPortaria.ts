import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useAuth";

export interface MovimentacaoPortaria {
  id: string;
  tipo_movimento: string;
  categoria: string;
  placa: string | null;
  motorista: string | null;
  empresa: string | null;
  destino_setor: string | null;
  motivo: string | null;
  carga_id: string | null;
  foto_placa_url: string | null;
  texto_placa_lido: string | null;
  confianca_placa: number | null;
  placa_confirmada: string | null;
  foto_documento_url: string | null;
  observacoes: string | null;
  usuario_id: string | null;
  data_hora: string;
  movimento_vinculado_id: string | null;
  created_at: string;
  // New fields
  tipo_operacao: string | null;
  documento: string | null;
  nome_completo: string | null;
  rota: string | null;
  peso: number | null;
  qtd_entregas: number | null;
  km_rota: number | null;
  km_inicial: number | null;
  km_final: number | null;
  km_rodado: number | null;
  horario_previsto_saida: string | null;
  horario_real_saida: string | null;
  horario_real_retorno: string | null;
  horario_saida_final: string | null;
  apelido: string | null;
  conferente: string | null;
  ocorrencia: string | null;
  nota_fiscal: string | null;
  servico_executar: string | null;
  responsavel_interno: string | null;
  pessoa_visitada: string | null;
  motivo_visita: string | null;
  telefone: string | null;
  descricao: string | null;
  tipo_carga: string | null;
  doca_setor: string | null;
  foto_painel_url: string | null;
  foto_nota_url: string | null;
  foto_lacre_url: string | null;
  foto_painel_saida_url: string | null;
  numero_lacre: string | null;
  horario_chegada: string | null;
  horario_entrada: string | null;
  etapa_terceirizado: string | null;
  tipo_caminhao: string | null;
  etapa_carga_propria: string | null;
}

export const CATEGORIAS = [
  { value: "carga_propria", label: "Carga Própria" },
  { value: "terceirizado", label: "Terceirizado" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "visitante", label: "Visitante" },
  { value: "prestador", label: "Prestador" },
  { value: "outros", label: "Outros" },
];

export const SETORES = [
  { value: "expedicao", label: "Expedição" },
  { value: "recebimento", label: "Recebimento" },
  { value: "administrativo", label: "Administrativo" },
  { value: "manutencao", label: "Manutenção" },
  { value: "outros", label: "Outros" },
];

export function useMovimentacoes(dateFrom: string, dateTo?: string) {
  const dateEnd = dateTo || dateFrom;
  const queryClient = useQueryClient();
  const session = useSession();

  const query = useQuery({
    queryKey: ["movimentacoes_portaria", dateFrom, dateEnd],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes_portaria")
        .select("*")
        .gte("data_hora", `${dateFrom}T00:00:00`)
        .lte("data_hora", `${dateEnd}T23:59:59.999`)
        .order("data_hora", { ascending: false });
      if (error) throw error;
      return data as MovimentacaoPortaria[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`movimentacoes-${dateFrom}-${dateEnd}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "movimentacoes_portaria" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["movimentacoes_portaria", dateFrom, dateEnd] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateFrom, dateEnd, queryClient]);

  return query;
}

export function useDeleteMovimentacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete linked records first (retornos pointing to this entrada)
      const { error: linkedError } = await supabase
        .from("movimentacoes_portaria")
        .delete()
        .eq("movimento_vinculado_id", id);
      if (linkedError) throw linkedError;
      // Then delete the record itself
      const { error } = await supabase
        .from("movimentacoes_portaria")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      toast.success("Registro excluído com sucesso!");
    },
    onError: (e: any) => {
      toast.error("Erro ao excluir: " + e.message);
    },
  });
}

export function useUpdateMovimentacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any> & { id: string }) => {
      const { data, error } = await supabase
        .from("movimentacoes_portaria")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      toast.success("Registro atualizado com sucesso!");
    },
    onError: (e: any) => {
      toast.error("Erro ao atualizar: " + e.message);
    },
  });
}

export function useCreateMovimentacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mov: Record<string, any>) => {
      const { data, error } = await supabase
        .from("movimentacoes_portaria")
        .insert(mov as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      toast.success("Movimento registrado com sucesso!");
    },
    onError: (e: any) => {
      toast.error("Erro ao registrar: " + e.message);
    },
  });
}

export async function uploadFotoMovimentacao(file: File, tipo: "placa" | "doc" | "painel" | "nota") {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `movimentacoes/${tipo}/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
  const { error } = await supabase.storage.from("portaria").upload(path, file);
  if (error) throw error;
  const { data: signedData, error: signError } = await supabase.storage.from("portaria").createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signError || !signedData?.signedUrl) throw signError || new Error("Failed to create signed URL");
  return signedData.signedUrl;
}

export function usePlacaAutocomplete(placa: string) {
  const [debouncedPlaca, setDebouncedPlaca] = useState("");

  useEffect(() => {
    if (placa.length < 3) {
      setDebouncedPlaca("");
      return;
    }
    const t = setTimeout(() => setDebouncedPlaca(placa.trim().toUpperCase()), 400);
    return () => clearTimeout(t);
  }, [placa]);

  return useQuery({
    queryKey: ["placa_autocomplete", debouncedPlaca],
    queryFn: async () => {
      if (!debouncedPlaca) return null;
      // Single query: fetch latest record + count via head in parallel
      const [latestRes, countRes] = await Promise.all([
        supabase
          .from("movimentacoes_portaria")
          .select("motorista, empresa, categoria, placa, destino_setor")
          .eq("placa", debouncedPlaca)
          .order("data_hora", { ascending: false })
          .limit(1),
        supabase
          .from("movimentacoes_portaria")
          .select("id", { count: "exact", head: true })
          .eq("placa", debouncedPlaca),
      ]);
      if (latestRes.error) throw latestRes.error;

      if (latestRes.data && latestRes.data.length > 0) {
        return { ...latestRes.data[0], totalRegistros: countRes.count || 0 };
      }
      return null;
    },
    enabled: debouncedPlaca.length >= 3,
    staleTime: 30_000,
  });
}
