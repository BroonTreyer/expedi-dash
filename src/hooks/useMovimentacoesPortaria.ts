import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

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
  numero_lacre: string | null;
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

export function useMovimentacoes(dateStr: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["movimentacoes_portaria", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes_portaria")
        .select("*")
        .gte("data_hora", `${dateStr}T00:00:00`)
        .lt("data_hora", `${dateStr}T23:59:59.999`)
        .order("data_hora", { ascending: false });
      if (error) throw error;
      return data as MovimentacaoPortaria[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`movimentacoes-${dateStr}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "movimentacoes_portaria" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["movimentacoes_portaria", dateStr] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateStr, queryClient]);

  return query;
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

export async function uploadFotoMovimentacao(file: File, tipo: "placa" | "doc") {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `movimentacoes/${tipo}/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
  const { error } = await supabase.storage.from("portaria").upload(path, file);
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("portaria").getPublicUrl(path);
  return urlData.publicUrl;
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
      const { data, error } = await supabase
        .from("movimentacoes_portaria")
        .select("motorista, empresa, categoria, placa, destino_setor")
        .eq("placa", debouncedPlaca)
        .order("data_hora", { ascending: false })
        .limit(1);
      if (error) throw error;

      const { count } = await supabase
        .from("movimentacoes_portaria")
        .select("id", { count: "exact", head: true })
        .eq("placa", debouncedPlaca);

      if (data && data.length > 0) {
        return { ...data[0], totalRegistros: count || 0 };
      }
      return null;
    },
    enabled: debouncedPlaca.length >= 3,
    staleTime: 30_000,
  });
}
