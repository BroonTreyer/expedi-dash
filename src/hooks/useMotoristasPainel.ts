import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";
import type { MovimentacaoPortaria } from "@/hooks/useMovimentacoesPortaria";
import type { Motorista } from "@/hooks/useMotoristas";

export interface MotoristaAgg {
  nome: string;
  cadastro: Motorista | null;
  movimentos: MovimentacaoPortaria[];
  rotas: number;
  km_total: number;
  km_medio: number;
  tempo_medio_min: number | null;
  peso_total: number;
  peso_medio: number;
  entregas_total: number;
  ultima_atividade: string | null;
  em_rota: boolean;
  em_rota_desde: string | null;
  km_por_dia: { dia: string; km: number }[];
}

function normNome(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase();
}

function calcKm(m: MovimentacaoPortaria): number {
  if (m.km_rodado != null && Number(m.km_rodado) > 0) return Number(m.km_rodado);
  if (m.km_inicial != null && m.km_final != null) {
    const d = Number(m.km_final) - Number(m.km_inicial);
    return d > 0 && d < 5000 ? d : 0; // sanity cap
  }
  return 0;
}

function calcTempoMin(m: MovimentacaoPortaria): number | null {
  const ini = m.horario_real_saida;
  const fim = m.horario_real_retorno || m.horario_saida_final;
  if (!ini || !fim) return null;
  const d = (new Date(fim).getTime() - new Date(ini).getTime()) / 60000;
  return d > 0 && d < 60 * 36 ? Math.round(d) : null;
}

export function useMotoristasPainel(opts: {
  startDate: string; // ISO yyyy-mm-dd
  endDate: string;
  categoria?: "todos" | "carga_propria" | "terceirizado";
}) {
  const session = useSession();
  const qc = { startDate: opts.startDate, endDate: opts.endDate, categoria: opts.categoria ?? "todos" };

  const query = useQuery({
    queryKey: ["motoristas-painel", qc],
    enabled: !!session,
    queryFn: async () => {
      const startISO = `${qc.startDate}T00:00:00.000Z`;
      const endNext = new Date(qc.endDate);
      endNext.setDate(endNext.getDate() + 1);
      const endISO = `${endNext.toISOString().split("T")[0]}T00:00:00.000Z`;

      let q = supabase
        .from("movimentacoes_portaria")
        .select("*")
        .gte("data_hora", startISO)
        .lt("data_hora", endISO)
        .not("motorista", "is", null)
        .order("data_hora", { ascending: false })
        .limit(5000);

      if (qc.categoria === "carga_propria") q = q.eq("categoria", "carga_propria");
      if (qc.categoria === "terceirizado") q = q.eq("categoria", "terceirizado");

      const [movsRes, motsRes] = await Promise.all([
        q,
        supabase.from("motoristas").select("*").eq("ativo", true),
      ]);
      if (movsRes.error) throw movsRes.error;
      if (motsRes.error) throw motsRes.error;

      const movs = (movsRes.data ?? []) as MovimentacaoPortaria[];
      const mots = (motsRes.data ?? []) as Motorista[];

      // Index motoristas por nome normalizado e por primeiro nome
      const motByNome = new Map<string, Motorista>();
      for (const m of mots) {
        motByNome.set(normNome(m.nome_completo), m);
      }

      const groups = new Map<string, MovimentacaoPortaria[]>();
      for (const m of movs) {
        const key = normNome(m.motorista);
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(m);
      }

      const aggs: MotoristaAgg[] = [];
      for (const [key, items] of groups.entries()) {
        // Considera "rotas" apenas saídas (com horario_real_saida) — evita contar entradas/visitantes
        const rotas = items.filter((i) =>
          i.tipo_movimento === "saida" || !!i.horario_real_saida || i.categoria === "carga_propria",
        );
        const kmList = rotas.map(calcKm);
        const km_total = kmList.reduce((a, b) => a + b, 0);
        const km_validos = kmList.filter((k) => k > 0);
        const km_medio = km_validos.length ? km_total / km_validos.length : 0;

        const tempos = rotas.map(calcTempoMin).filter((n): n is number => n != null);
        const tempo_medio_min = tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null;

        const pesos = rotas.map((i) => Number(i.peso) || 0).filter((p) => p > 0);
        const peso_total = pesos.reduce((a, b) => a + b, 0);
        const peso_medio = pesos.length ? peso_total / pesos.length : 0;

        const entregas_total = rotas.reduce((a, b) => a + (Number(b.qtd_entregas) || 0), 0);

        const ultima = items[0]?.data_hora ?? null;

        const emRotaItem = items.find((i) =>
          (i.etapa_carga_propria === "em_rota" || i.etapa_terceirizado === "em_rota") &&
          !!i.horario_real_saida &&
          !i.horario_real_retorno &&
          !i.horario_saida_final,
        );

        // KM por dia (últimos 14 dias do range)
        const byDay = new Map<string, number>();
        for (const r of rotas) {
          const d = (r.horario_real_saida || r.data_hora).slice(0, 10);
          byDay.set(d, (byDay.get(d) ?? 0) + calcKm(r));
        }
        const km_por_dia = [...byDay.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([dia, km]) => ({ dia, km }));

        aggs.push({
          nome: items[0]?.motorista || key,
          cadastro: motByNome.get(key) ?? null,
          movimentos: items,
          rotas: rotas.length,
          km_total,
          km_medio,
          tempo_medio_min,
          peso_total,
          peso_medio,
          entregas_total,
          ultima_atividade: ultima,
          em_rota: !!emRotaItem,
          em_rota_desde: emRotaItem?.horario_real_saida ?? null,
          km_por_dia,
        });
      }

      aggs.sort((a, b) => b.km_total - a.km_total);
      return aggs;
    },
  });

  // Realtime: invalida a query em alterações na portaria (debounce 1.5s)
  useEffect(() => {
    if (!session) return;
    let timer: number | undefined;
    const channel = supabase
      .channel("motoristas-painel-mov")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "movimentacoes_portaria" },
        () => {
          if (timer) window.clearTimeout(timer);
          timer = window.setTimeout(() => {
            query.refetch();
          }, 1500);
        },
      )
      .subscribe();
    return () => {
      if (timer) window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, qc.startDate, qc.endDate, qc.categoria]);

  return query;
}
