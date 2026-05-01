import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useSession } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { ParsedRow } from "@/components/portaria/ImportarPlanilhaDialog";

export type StatusAutorizacao = "previsto" | "aguardando_vinculo" | "aguardando_autorizacao" | "autorizado" | "recusado";

export interface VeiculoEsperado {
  id: string;
  data_referencia: string;
  grupo: string;
  placa: string;
  destino: string | null;
  carga_id: string | null;
  peso: number | null;
  qtd_entregas: number | null;
  motorista: string | null;
  transportadora: string | null;
  ajudantes: string | null;
  tipo_veiculo: string | null;
  conferido: boolean;
  conferido_por: string | null;
  conferido_em: string | null;
  created_at: string;
  criado_por: string | null;
  walk_in: boolean;
  status_autorizacao: StatusAutorizacao;
  autorizado_por: string | null;
  autorizado_em: string | null;
  motivo_recusa: string | null;
  observacoes: string | null;
}


/**
 * Walk-ins ainda em circulação na página Registro de Entrada:
 * - aguardando_vinculo: Logística ainda não fechou carga
 * - autorizado: Logística vinculou e liberou — aguardando porteiro registrar chegada
 * Sempre filtrado por conferido=false (depois que porteiro registra chegada, sai da lista).
 */
interface VeiculoEsperadoEnriquecido extends VeiculoEsperado {
  autorizado_por_nome?: string | null;
  autorizado_por_email?: string | null;
}

export function useVeiculosWalkInAtivos() {
  const session = useSession();
  return useQuery({
    queryKey: ["veiculos_walkin_ativos"],
    enabled: !!session,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos_esperados" as any)
        .select("*")
        .eq("walk_in", true)
        .eq("conferido", false)
        // Mostra: aguardando_vinculo (qualquer) OU autorizado SEM carga_id.
        // Walk-ins autorizados COM carga_id são responsabilidade do
        // CargasFechadasAguardandoPanel (card azul), evitando duplicação.
        .or("status_autorizacao.eq.aguardando_vinculo,and(status_autorizacao.eq.autorizado,carga_id.is.null)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as VeiculoEsperado[];

      // Resolve nomes/emails dos autorizadores em uma única query
      const ids = Array.from(
        new Set(rows.map((r) => r.autorizado_por).filter((v): v is string => !!v))
      );
      let profilesMap = new Map<string, { nome: string | null; email: string | null }>();
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nome, email")
          .in("id", ids);
        for (const p of profs ?? []) {
          profilesMap.set(p.id, { nome: p.nome, email: p.email });
        }
      }

      return rows.map((r) => ({
        ...r,
        autorizado_por_nome: r.autorizado_por ? profilesMap.get(r.autorizado_por)?.nome ?? null : null,
        autorizado_por_email: r.autorizado_por ? profilesMap.get(r.autorizado_por)?.email ?? null : null,
      })) as VeiculoEsperadoEnriquecido[];
    },
  });
}

/**
 * Porteiro confirma a chegada física do veículo walk-in já liberado.
 * Cria a movimentação de entrada e marca veiculo_esperado como conferido.
 */
/**
 * Contagem leve de walk-ins pendentes (para badge no menu).
 * Retorna { aguardando, liberados, total }.
 */
export function useWalkInPendentesCount() {
  const session = useSession();
  return useQuery({
    queryKey: ["veiculos_walkin_pendentes_count"],
    enabled: !!session,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos_esperados" as any)
        .select("status_autorizacao,carga_id")
        .eq("walk_in", true)
        .eq("conferido", false)
        .in("status_autorizacao", ["aguardando_vinculo", "autorizado"]);
      if (error) throw error;
      const rows = (data ?? []) as unknown as { status_autorizacao: StatusAutorizacao; carga_id: string | null }[];
      // Mantém paridade com useVeiculosWalkInAtivos: ignora autorizados já vinculados a carga
      // (eles aparecem no painel "Cargas fechadas aguardando veículo").
      const aguardando = rows.filter((r) => r.status_autorizacao === "aguardando_vinculo").length;
      const liberados = rows.filter((r) => r.status_autorizacao === "autorizado" && !r.carga_id).length;
      return { aguardando, liberados, total: aguardando + liberados };
    },
  });
}

export function useRegistrarChegadaPortaria() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (v: VeiculoEsperado) => {
      const isCargaPropria = (v.grupo || "").toUpperCase().includes("PROPRIA") || (v.grupo || "").toUpperCase().includes("PRÓPRIA");
      const categoria = isCargaPropria ? "carga_propria" : "terceirizado";
      const nowIso = new Date().toISOString();
      const placaNorm = (v.placa || "").trim().toUpperCase();

      // Procura movimentação de chegada já criada (no momento do walk-in)
      // para apenas marcar a entrada no pátio, preservando horario_chegada real.
      let movExistenteId: string | null = null;
      if (placaNorm) {
        const etapaField = categoria === "terceirizado" ? "etapa_terceirizado" : "etapa_carga_propria";
        const etapaChegada = categoria === "terceirizado" ? "chegada" : "aguardando_liberacao";
        const { data: existentes } = await supabase
          .from("movimentacoes_portaria")
          .select("id, data_hora")
          .ilike("placa", placaNorm)
          .eq("tipo_movimento", "entrada")
          .eq("categoria", categoria)
          .eq(etapaField, etapaChegada)
          .is("horario_entrada", null)
          .order("data_hora", { ascending: false })
          .limit(1);
        if (existentes && existentes.length > 0) {
          movExistenteId = (existentes[0] as any).id;
        }
      }

      if (movExistenteId) {
        const upd: Record<string, any> = {
          horario_entrada: nowIso,
          carga_id: v.carga_id,
          peso: v.peso,
          qtd_entregas: v.qtd_entregas,
        };
        if (categoria === "terceirizado") upd.etapa_terceirizado = "no_patio";
        else upd.etapa_carga_propria = "chegou";
        const { error: updErr } = await supabase
          .from("movimentacoes_portaria")
          .update(upd as any)
          .eq("id", movExistenteId);
        if (updErr) throw updErr;
      } else {
        // Fallback (walk-ins antigos sem movimentação prévia): cria a movimentação
        // usando created_at do veiculo_esperado como aproximação do horario_chegada.
        const movPayload: Record<string, any> = {
          tipo_movimento: "entrada",
          categoria,
          placa: v.placa,
          motorista: v.motorista,
          tipo_caminhao: v.tipo_veiculo,
          carga_id: v.carga_id,
          peso: v.peso,
          qtd_entregas: v.qtd_entregas,
          horario_entrada: nowIso,
          horario_chegada: v.created_at,
          data_hora: nowIso,
          usuario_id: user?.id ?? null,
          observacoes: v.observacoes,
        };
        if (categoria === "terceirizado") {
          movPayload.empresa = v.transportadora;
          movPayload.etapa_terceirizado = "no_patio";
        } else {
          movPayload.etapa_carga_propria = "chegou";
        }
        const { error: movErr } = await supabase
          .from("movimentacoes_portaria")
          .insert(movPayload as any);
        if (movErr) throw movErr;
      }

      const { error: updErr } = await supabase
        .from("veiculos_esperados" as any)
        .update({
          conferido: true,
          conferido_por: user?.id ?? null,
          conferido_em: nowIso,
        } as any)
        .eq("id", v.id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_ativos"] });
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_pendentes_count"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados_pendentes"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      toast.success("Entrada liberada — veículo no pátio");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao registrar chegada"),
  });
}

export function useRegistrarChegadaWalkIn() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      placa: string;
      motorista?: string;
      transportadora?: string;
      tipo_veiculo?: string;
      destino?: string;
      observacoes?: string;
      grupo?: string;
    }) => {
      const today = new Date().toISOString().slice(0, 10);
      const nowIso = new Date().toISOString();
      const grupoStr = (input.grupo || "WALK-IN").toUpperCase();
      const isCargaPropria = grupoStr.includes("PROPRIA") || grupoStr.includes("PRÓPRIA");
      const categoria = isCargaPropria ? "carga_propria" : "terceirizado";
      const placaNorm = input.placa.toUpperCase().trim();

      const { data, error } = await supabase
        .from("veiculos_esperados" as any)
        .insert({
          data_referencia: today,
          grupo: input.grupo || "WALK-IN",
          placa: placaNorm,
          motorista: input.motorista || null,
          transportadora: input.transportadora || null,
          tipo_veiculo: input.tipo_veiculo || null,
          destino: input.destino || null,
          observacoes: input.observacoes || null,
          walk_in: true,
          status_autorizacao: "aguardando_vinculo",
          criado_por: user?.id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Cria já a movimentação de portaria registrando a CHEGADA física
      // (sem entrada no pátio ainda). Carga é vinculada depois pela Logística;
      // a entrada no pátio é liberada num segundo passo pela Portaria.
      const movPayload: Record<string, any> = {
        tipo_movimento: "entrada",
        categoria,
        placa: placaNorm,
        motorista: input.motorista || null,
        empresa: input.transportadora || null,
        tipo_caminhao: input.tipo_veiculo || null,
        carga_id: null,
        horario_chegada: nowIso,
        horario_entrada: null,
        data_hora: nowIso,
        usuario_id: user?.id ?? null,
        observacoes: input.observacoes || null,
      };
      if (categoria === "terceirizado") {
        movPayload.etapa_terceirizado = "chegada";
      } else {
        movPayload.etapa_carga_propria = "aguardando_liberacao";
      }
      // Se a inserção da movimentação falhar não revertemos o veiculo_esperado
      // — o fluxo de liberação ainda funciona via fallback antigo.
      await supabase.from("movimentacoes_portaria").insert(movPayload as any);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados_pendentes"] });
      qc.invalidateQueries({ queryKey: ["veiculos_aguardando_vinculo"] });
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_pendentes_count"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      toast.success("Entrada registrada — aguardando vínculo de carga pela Logística");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao registrar entrada"),
  });
}

export function useVeiculosAguardandoVinculo() {
  const session = useSession();
  return useQuery({
    queryKey: ["veiculos_aguardando_vinculo"],
    enabled: !!session,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos_esperados" as any)
        .select("*")
        .eq("walk_in", true)
        .eq("status_autorizacao", "aguardando_vinculo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VeiculoEsperado[];
    },
  });
}

export function useAutorizarChegada() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, autorizar, motivo }: { id: string; autorizar: boolean; motivo?: string }) => {
      const { error } = await supabase
        .from("veiculos_esperados" as any)
        .update({
          status_autorizacao: autorizar ? "autorizado" : "recusado",
          autorizado_por: user?.id ?? null,
          autorizado_em: new Date().toISOString(),
          motivo_recusa: autorizar ? null : (motivo || null),
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados_pendentes"] });
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_ativos"] });
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_pendentes_count"] });
      toast.success(vars.autorizar ? "Carga vinculada — aguardando Portaria liberar entrada física" : "Entrada recusada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao processar autorização"),
  });
}

export function useVeiculosEsperados(dataReferencia: string, dataFim?: string) {
  // Se dataFim for informado, usa o intervalo exato selecionado pelo usuário.
  // Caso contrário, mantém a janela legada de ±3 dias para compatibilidade
  // com chamadas que passam apenas uma data (ex.: painel A Chegar).
  const { dataInicio, dataLimite } = (() => {
    if (dataFim && dataFim.length === 10) {
      const start = dataReferencia <= dataFim ? dataReferencia : dataFim;
      const end = dataReferencia <= dataFim ? dataFim : dataReferencia;
      return { dataInicio: start, dataLimite: end };
    }
    const ini = new Date(dataReferencia + "T00:00:00");
    ini.setDate(ini.getDate() - 3);
    const lim = new Date(dataReferencia + "T00:00:00");
    lim.setDate(lim.getDate() + 3);
    return {
      dataInicio: ini.toISOString().slice(0, 10),
      dataLimite: lim.toISOString().slice(0, 10),
    };
  })();

  const session = useSession();

  return useQuery({
    queryKey: ["veiculos_esperados", dataInicio, dataLimite],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos_esperados" as any)
        .select("*")
        .gte("data_referencia", dataInicio)
        .lte("data_referencia", dataLimite)
        .order("data_referencia", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VeiculoEsperado[];
    },
  });
}

function parseDataReferencia(raw: string | undefined | null, fallback: string): string {
  if (!raw || !raw.trim()) return fallback;
  const s = raw.trim();

  // yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // dd/MM/yyyy
  const full = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (full) {
    const [, d, m, y] = full;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // dd/MM (assume current year)
  const short = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (short) {
    const [, d, m] = short;
    const y = new Date().getFullYear();
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Excel serial number
  const num = Number(s);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = new Date((num - 25569) * 86400000);
    return d.toISOString().slice(0, 10);
  }

  return fallback;
}

export function useImportarVeiculosEsperados() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ rows, dataReferencia }: { rows: ParsedRow[]; dataReferencia: string }) => {
      // Collect all unique dates from rows
      const dates = new Set<string>();
      const inserts = rows.map((r) => {
        const dr = parseDataReferencia((r as any).data, dataReferencia);
        dates.add(dr);
        return {
          data_referencia: dr,
          grupo: r.grupo,
          placa: r.placa.toUpperCase().trim(),
          destino: r.destino || null,
          carga_id: r.carga_id || null,
          peso: r.peso,
          qtd_entregas: r.qtd_entregas,
          motorista: r.motorista || null,
          transportadora: r.transportadora || null,
          ajudantes: r.ajudantes || null,
          tipo_veiculo: r.tipo_veiculo || null,
          criado_por: user?.id ?? null,
        };
      });

      // Delete existing for all affected dates
      for (const dt of dates) {
        await supabase
          .from("veiculos_esperados" as any)
          .delete()
          .eq("data_referencia", dt);
      }

      const { error } = await supabase
        .from("veiculos_esperados" as any)
        .insert(inserts);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      toast.success(`${vars.rows.length} veículos carregados na lista de esperados`);
    },
    onError: () => {
      toast.error("Erro ao importar veículos esperados");
    },
  });
}

export function useMarcarConferido() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ placa, dataReferencia }: { placa: string; dataReferencia: string }) => {
      const { error } = await supabase
        .from("veiculos_esperados" as any)
        .update({
          conferido: true,
          conferido_por: user?.id ?? null,
          conferido_em: new Date().toISOString(),
        } as any)
        .eq("data_referencia", dataReferencia)
        .eq("placa", placa);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
    },
  });
}

export function useDeleteVeiculosEsperados() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("veiculos_esperados" as any)
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      toast.success(`${ids.length} veículo(s) excluído(s)`);
    },
    onError: () => {
      toast.error("Erro ao excluir veículos selecionados");
    },
  });
}

export function useLimparVeiculosEsperados() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ dataInicio, dataFim }: { dataInicio: string; dataFim: string }) => {
      const { error } = await supabase
        .from("veiculos_esperados" as any)
        .delete()
        .gte("data_referencia", dataInicio)
        .lte("data_referencia", dataFim);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      toast.success("Lista de veículos esperados limpa");
    },
    onError: () => {
      toast.error("Erro ao limpar lista");
    },
  });
}

/**
 * Reabre uma movimentação de portaria (terceirizado no pátio sem carga vinculada)
 * de volta para Registro de Entrada como walk-in `aguardando_vinculo`,
 * para que a Logística consiga vincular uma carga e, depois, a Portaria
 * libere a entrada física novamente.
 *
 * Fluxo: INSERT em veiculos_esperados (walk_in=true, aguardando_vinculo)
 * + DELETE da movimentacoes_portaria original (auditoria automática via trigger).
 */
export function useReabrirComoWalkIn() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (m: {
      id: string;
      placa: string | null;
      motorista: string | null;
      empresa: string | null;
      tipo_caminhao: string | null;
      data_hora: string;
    }) => {
      if (!m.placa) {
        throw new Error("Movimentação sem placa — não é possível enviar para Registro de Entrada");
      }
      const today = new Date().toISOString().slice(0, 10);
      const userLabel = user?.email || user?.id || "usuário";
      const horaEntrada = new Date(m.data_hora).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
      const obs = `Reaberto do Pátio Atual em ${new Date().toLocaleString("pt-BR")} por ${userLabel} — entrada original registrada em ${horaEntrada}`;

      const { error: insErr } = await supabase
        .from("veiculos_esperados" as any)
        .insert({
          data_referencia: today,
          grupo: "WALK-IN-TERCEIRIZADO",
          placa: m.placa.toUpperCase().trim(),
          motorista: m.motorista,
          transportadora: m.empresa,
          tipo_veiculo: m.tipo_caminhao,
          walk_in: true,
          status_autorizacao: "aguardando_vinculo",
          observacoes: obs,
          criado_por: user?.id ?? null,
        } as any);
      if (insErr) throw insErr;

      // Cria registro de chegada em movimentacoes_portaria preservando o
      // horário original de entrada (m.data_hora) como horario_chegada — assim
      // o tempo total no pátio continua sendo computado corretamente.
      const { error: movErr } = await supabase
        .from("movimentacoes_portaria")
        .insert({
          tipo_movimento: "entrada",
          categoria: "terceirizado",
          placa: m.placa.toUpperCase().trim(),
          motorista: m.motorista,
          empresa: m.empresa,
          tipo_caminhao: m.tipo_caminhao,
          etapa_terceirizado: "chegada",
          horario_chegada: m.data_hora,
          data_hora: m.data_hora,
          observacoes: obs,
          usuario_id: user?.id ?? null,
        } as any);
      if (movErr) throw movErr;

      const { error: delErr } = await supabase
        .from("movimentacoes_portaria")
        .delete()
        .eq("id", m.id);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movimentacoes_portaria"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados"] });
      qc.invalidateQueries({ queryKey: ["veiculos_esperados_pendentes"] });
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_ativos"] });
      qc.invalidateQueries({ queryKey: ["veiculos_walkin_pendentes_count"] });
      qc.invalidateQueries({ queryKey: ["veiculos_aguardando_vinculo"] });
      toast.success("Veículo enviado para Registro de Entrada — disponível para vínculo de carga");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao enviar veículo para Registro de Entrada"),
  });
}
