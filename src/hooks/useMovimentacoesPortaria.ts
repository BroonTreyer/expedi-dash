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
  etapa_terceirizado: EtapaTerceirizado | null;
  tipo_caminhao: string | null;
  etapa_carga_propria: EtapaCargaPropria | null;
}

/** Etapas válidas — espelham os triggers `validate_etapa_*` do banco. */
export type EtapaCargaPropria = "chegou" | "em_rota" | "retornou" | "finalizado";
export type EtapaTerceirizado = "chegada" | "no_patio" | "carregando" | "finalizado";

export const CATEGORIAS = [
  { value: "carga_propria", label: "Varejo" },
  { value: "terceirizado", label: "Distribuidores" },
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

/**
 * Veículos atualmente ATIVOS no pátio — não filtra pelo dia atual.
 * Pega entradas dos últimos 7 dias que ainda não estão finalizadas e
 * que ainda não têm uma saída vinculada. Usado pela aba "Pátio" da
 * Portaria para que veículos que entraram em dias anteriores e ainda
 * não saíram continuem visíveis. Inclui também movimentos de "carga
 * própria" em rota / retornados.
 */
export function useMovimentacoesAtivasPatio() {
  const queryClient = useQueryClient();
  const session = useSession();

  const query = useQuery({
    queryKey: ["movimentacoes_portaria_ativas_patio"],
    enabled: !!session,
    staleTime: 15_000,
    queryFn: async () => {
      const desde = new Date();
      desde.setDate(desde.getDate() - 7);
      const desdeIso = desde.toISOString();

      const { data, error } = await supabase
        .from("movimentacoes_portaria")
        .select("*")
        .gte("data_hora", desdeIso)
        .order("data_hora", { ascending: false });
      if (error) throw error;

      const all = (data ?? []) as MovimentacaoPortaria[];
      // Constrói set de entradas que já têm saída vinculada (não estão mais no pátio)
      const saidasVinculadas = new Set(
        all
          .filter((m) => m.tipo_movimento === "saida" && m.movimento_vinculado_id)
          .map((m) => m.movimento_vinculado_id!)
      );

      // Indexa por placa normalizada para detectar ciclos posteriores que
      // tornam uma entrada antiga obsoleta (ex.: o motorista voltou em
      // outro dia e finalizou). Sem isso, entradas órfãs antigas ficam
      // pendurando no pátio com "161h" e poluindo a operação atual.
      const norm = (p: string | null) => (p || "").trim().toUpperCase();
      const porPlaca = new Map<string, MovimentacaoPortaria[]>();
      for (const m of all) {
        const k = norm(m.placa);
        if (!k) continue;
        const arr = porPlaca.get(k) ?? [];
        arr.push(m);
        porPlaca.set(k, arr);
      }

      const ehFinalizado = (m: MovimentacaoPortaria) =>
        m.tipo_movimento === "saida" ||
        (m.categoria === "terceirizado" && m.etapa_terceirizado === "finalizado") ||
        (m.categoria === "carga_propria" && m.etapa_carga_propria === "finalizado") ||
        !!m.horario_saida_final ||
        !!m.horario_real_saida;

      // C6 — pré-computa o timestamp do MAIS RECENTE movimento finalizado por
      // placa. Antes o filtro chamava `irmaos.some()` por linha (O(N×M)).
      // Agora cada decisão vira lookup O(1).
      const tsFinalPorPlaca = new Map<string, number>();
      for (const [placa, irmaos] of porPlaca) {
        let maxTs = -Infinity;
        for (const x of irmaos) {
          if (ehFinalizado(x)) {
            const t = new Date(x.data_hora).getTime();
            if (t > maxTs) maxTs = t;
          }
        }
        if (maxTs !== -Infinity) tsFinalPorPlaca.set(placa, maxTs);
      }
      const haCicloPosteriorFinalizado = (m: MovimentacaoPortaria): boolean => {
        const k = norm(m.placa);
        const tsFinal = tsFinalPorPlaca.get(k);
        if (tsFinal === undefined) return false;
        return tsFinal > new Date(m.data_hora).getTime();
      };

      return all.filter((m) => {
        // Carga própria LEGADO (pré-Onda 4): registros antigos com
        // tipo_movimento='saida'. Após a normalização da Onda 4 quase não
        // existem mais, mas o ramo permanece como defesa.
        if (m.categoria === "carga_propria" && m.tipo_movimento === "saida" && m.etapa_carga_propria) {
          if (m.etapa_carga_propria === "finalizado") return false;
          if (haCicloPosteriorFinalizado(m)) return false;
          return true;
        }
        // Para o pátio só interessam entradas
        if (m.tipo_movimento !== "entrada") return false;
        // Já saiu (saida explicitamente vinculada)
        if (saidasVinculadas.has(m.id)) return false;
        // Terceirizado finalizado: já saiu
        if (m.categoria === "terceirizado" && m.etapa_terceirizado === "finalizado") return false;
        // BUGFIX pós-Onda 4: hoje toda Carga Própria é tipo_movimento='entrada'
        // e o ciclo termina via etapa_carga_propria='finalizado'. Sem este
        // filtro o veículo finalizado continuava aparecendo no Pátio Atual.
        if (m.categoria === "carga_propria" && m.etapa_carga_propria === "finalizado") return false;
        // Defesa extra: horario_saida_final preenchido também encerra o ciclo
        // (cobre registros editados manualmente que pulam etapas).
        if (m.categoria === "carga_propria" && m.horario_saida_final) return false;
        // Entrada antiga obsoleta: ciclo posterior da mesma placa já finalizou.
        if (haCicloPosteriorFinalizado(m)) return false;
        return true;
      });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`movimentacoes-ativas-patio-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "movimentacoes_portaria" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["movimentacoes_portaria_ativas_patio"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_portaria_ativas_patio"] });
      queryClient.invalidateQueries({ queryKey: ["status_portaria_por_carga"] });
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
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_portaria_ativas_patio"] });
      queryClient.invalidateQueries({ queryKey: ["status_portaria_por_carga"] });
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
      // Trava anti-órfão: ao registrar uma "saida" sem vínculo explícito,
      // exige que exista uma entrada ativa correspondente (mesma placa,
      // ainda no pátio) nas últimas 72h. Sem isso a saída fica órfã e
      // contamina o status da carga nos painéis.
      if (
        mov.tipo_movimento === "saida" &&
        !mov.movimento_vinculado_id &&
        mov.placa
      ) {
        const placaNorm = String(mov.placa).trim().toUpperCase();
        const desde = new Date();
        desde.setHours(desde.getHours() - 72);
        const { data: entradas } = await supabase
          .from("movimentacoes_portaria")
          .select("id, etapa_terceirizado, etapa_carga_propria, categoria")
          .ilike("placa", placaNorm)
          .eq("tipo_movimento", "entrada")
          .gte("data_hora", desde.toISOString())
          .order("data_hora", { ascending: false })
          .limit(5);
        const ativa = (entradas ?? []).some(
          (e: any) =>
            !(e.categoria === "terceirizado" && e.etapa_terceirizado === "finalizado") &&
            !(e.categoria === "carga_propria" && e.etapa_carga_propria === "finalizado"),
        );
        if (!ativa) {
          throw new Error(
            "Não há entrada ativa para esta placa nas últimas 72h. Registre a entrada primeiro ou use 'Saída' a partir do pátio.",
          );
        }
      }

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
      queryClient.invalidateQueries({ queryKey: ["movimentacoes_portaria_ativas_patio"] });
      queryClient.invalidateQueries({ queryKey: ["status_portaria_por_carga"] });
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
