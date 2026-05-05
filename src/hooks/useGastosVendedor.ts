import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

export type DestinoDetalhe = {
  cidade: string;
  uf: string;
  peso: number;
  valor_kg: number;
  frete: number;
  sem_tarifa: boolean;
};

export type GastoDetalhe = {
  carga_id: string;
  nome_carga: string | null;
  ordem_carga: string | null;
  data: string | null;
  tipo_caminhao: string | null;
  tipo_veiculo_normalizado: "bitruck" | "carreta";
  tipo_frete_carga: "cif" | "fob" | "misto" | "nao_classificado";
  peso_vendedor_kg: number;
  peso_total_carga_kg: number;
  previsto: number;
  realizado: number | null;
  divergencia_pct: number | null;
  numero_cte: string | null;
  vendedores_na_carga: number;
  destinos_sem_tarifa: number;
  destinos: DestinoDetalhe[];
  pedidos: Array<{ numero_pedido: number | null; cliente: string | null; cidade: string | null; uf: string | null; peso: number }>;
};

export type GastoVendedor = {
  vendedor_id: string;
  nome_vendedor: string;
  codigo_vendedor: string;
  peso_kg: number;
  frete_previsto: number;
  frete_realizado: number;
  cargas_count: number;
  ctes_count: number;
  cobertura_cte_pct: number;
  detalhes: GastoDetalhe[];
};

export type CoberturaTipoFrete = {
  cif: number;
  fob: number;
  misto: number;
  nao_classificado: number;
  total: number;
};

export type GastosVendedorResult = {
  vendedores: GastoVendedor[];
  cobertura: CoberturaTipoFrete;
};

export type FiltroTipoFrete = "cif" | "todos" | "incluir_nao_classificado";

function normalizeTipo(t: string | null | undefined): "bitruck" | "carreta" {
  const s = (t ?? "").toLowerCase();
  if (s.includes("carreta") || s.includes("truck") && s.includes("ca")) return "carreta";
  if (s.includes("carreta")) return "carreta";
  return "bitruck";
}
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function useGastosVendedor(dataInicial: string, dataFinal: string) {
  const session = useSession();
  return useQuery({
    queryKey: ["gastos_vendedor_v4_cif_only", dataInicial, dataFinal],
    enabled: !!session,
    staleTime: 30_000,
    queryFn: async (): Promise<GastosVendedorResult> => {
      // 1) Pedidos de cargas fechadas no período
      const { data: items, error: iErr } = await supabase
        .from("carregamentos_dia")
        .select("carga_id, nome_carga, ordem_carga, data, tipo_caminhao, tipo_frete, vendedor_id, peso, numero_pedido, cliente, cidade, uf")
        .eq("etapa", "logistica")
        .not("carga_id", "is", null)
        .gte("data", dataInicial)
        .lte("data", dataFinal)
        .limit(10000);
      if (iErr) throw iErr;
      if (!items || items.length === 0) {
        return { vendedores: [], cobertura: { cif: 0, fob: 0, misto: 0, nao_classificado: 0, total: 0 } };
      }

      const cargaIds = Array.from(new Set(items.map((i: any) => i.carga_id).filter(Boolean))) as string[];

      // 2) Tabela frete + vendedores + CT-es vinculados em paralelo
      const [tarifasRes, vendRes, ctesRes] = await Promise.all([
        supabase.from("tabela_frete" as any).select("destino_cidade, destino_uf, tipo_veiculo, valor_kg, ativo"),
        supabase.from("vendedores").select("id, codigo_vendedor, nome_vendedor"),
        (supabase as any).from("ctes_dacte").select("numero_cte, valor_frete, carga_id, status").in("carga_id", cargaIds),
      ]);

      const tarifaMap = new Map<string, number>();
      for (const t of (tarifasRes.data ?? []) as any[]) {
        if (t.ativo === false) continue;
        const k = `${norm(t.destino_cidade)}|${norm(t.destino_uf)}|${t.tipo_veiculo}`;
        tarifaMap.set(k, Number(t.valor_kg) || 0);
      }
      const vendMap = new Map<string, { nome: string; codigo: string }>(
        ((vendRes.data ?? []) as any[]).map((v) => [v.id, { nome: v.nome_vendedor, codigo: v.codigo_vendedor }]),
      );
      const cteMap = new Map<string, { valor: number; numero: string }>();
      for (const c of (ctesRes.data ?? []) as any[]) {
        if (!c.carga_id || !["vinculado", "divergente"].includes(c.status)) continue;
        const cur = cteMap.get(c.carga_id);
        cteMap.set(c.carga_id, {
          valor: (cur?.valor ?? 0) + (Number(c.valor_frete) || 0),
          numero: cur?.numero ?? c.numero_cte,
        });
      }

      // 3) Agrupa pedidos por carga -> destino -> vendedor
      type DestVendData = {
        peso: number;
        pedidos: Array<{ numero_pedido: number | null; cliente: string | null; cidade: string | null; uf: string | null; peso: number }>;
      };
      type DestData = {
        cidade: string;
        uf: string;
        peso_total: number;
        porVendedor: Map<string, DestVendData>;
      };
      type CargaData = {
        nome_carga: string | null;
        ordem_carga: string | null;
        data: string | null;
        tipo_caminhao: string | null;
        tipo_norm: "bitruck" | "carreta";
        tipos_frete: Set<string>;
        peso_total: number;
        destinos: Map<string, DestData>;
      };

      const cargas = new Map<string, CargaData>();
      for (const it of items as any[]) {
        const cid = it.carga_id as string;
        if (!cid) continue;
        let cd = cargas.get(cid);
        if (!cd) {
          cd = {
            nome_carga: it.nome_carga ?? null,
            ordem_carga: it.ordem_carga ?? null,
            data: it.data ?? null,
            tipo_caminhao: it.tipo_caminhao ?? null,
            tipo_norm: normalizeTipo(it.tipo_caminhao),
            tipos_frete: new Set<string>(),
            peso_total: 0,
            destinos: new Map(),
          };
          cargas.set(cid, cd);
        }
        const tf = (it.tipo_frete ?? "").toString().trim().toUpperCase();
        if (tf === "CIF" || tf === "FOB") cd.tipos_frete.add(tf);
        if (!cd.nome_carga && it.nome_carga) cd.nome_carga = it.nome_carga;
        if (!cd.ordem_carga && it.ordem_carga) cd.ordem_carga = it.ordem_carga;
        if (!cd.tipo_caminhao && it.tipo_caminhao) {
          cd.tipo_caminhao = it.tipo_caminhao;
          cd.tipo_norm = normalizeTipo(it.tipo_caminhao);
        }
        const peso = Number(it.peso) || 0;
        cd.peso_total += peso;

        const cidade = it.cidade ?? "—";
        const uf = it.uf ?? "—";
        const dkey = `${norm(cidade)}|${norm(uf)}`;
        let dd = cd.destinos.get(dkey);
        if (!dd) {
          dd = { cidade, uf, peso_total: 0, porVendedor: new Map() };
          cd.destinos.set(dkey, dd);
        }
        dd.peso_total += peso;
        const vid = it.vendedor_id;
        if (!vid || peso <= 0) continue;
        let vd = dd.porVendedor.get(vid);
        if (!vd) {
          vd = { peso: 0, pedidos: [] };
          dd.porVendedor.set(vid, vd);
        }
        vd.peso += peso;
        vd.pedidos.push({
          numero_pedido: it.numero_pedido ?? null,
          cliente: it.cliente ?? null,
          cidade,
          uf,
          peso,
        });
      }

      // 4) Acumula por vendedor
      const acc = new Map<string, GastoVendedor>();
      const cargasPorVend = new Map<string, Set<string>>();
      const cargasComCtePorVend = new Map<string, Set<string>>();
      const cobertura: CoberturaTipoFrete = { cif: 0, fob: 0, misto: 0, nao_classificado: 0, total: 0 };

      for (const [cid, cd] of cargas) {
        // Classifica tipo de frete da carga
        let tipoFreteCarga: GastoDetalhe["tipo_frete_carga"];
        if (cd.tipos_frete.size === 0) tipoFreteCarga = "nao_classificado";
        else if (cd.tipos_frete.size > 1) tipoFreteCarga = "misto";
        else if (cd.tipos_frete.has("CIF")) tipoFreteCarga = "cif";
        else tipoFreteCarga = "fob";

        cobertura.total += 1;
        cobertura[tipoFreteCarga] += 1;

        // Sempre exclui FOB e misto (que contém FOB).
        if (tipoFreteCarga === "fob" || tipoFreteCarga === "misto") continue;

        const cte = cteMap.get(cid) ?? null;
        // Calcula previsto por destino
        const destinosArr: DestinoDetalhe[] = [];
        let previstoCarga = 0;
        const previstoPorVend = new Map<string, number>();
        const pesoPorVend = new Map<string, number>();
        const pedidosPorVend = new Map<string, GastoDetalhe["pedidos"]>();
        let vendsSet = new Set<string>();

        for (const [, dd] of cd.destinos) {
          const k = `${norm(dd.cidade)}|${norm(dd.uf)}|${cd.tipo_norm}`;
          const valor_kg = tarifaMap.get(k) ?? 0;
          const sem_tarifa = !tarifaMap.has(k);
          const frete = dd.peso_total * valor_kg;
          previstoCarga += frete;
          destinosArr.push({ cidade: dd.cidade, uf: dd.uf, peso: dd.peso_total, valor_kg, frete, sem_tarifa });

          if (dd.peso_total <= 0) continue;
          for (const [vid, vData] of dd.porVendedor) {
            vendsSet.add(vid);
            const share = vData.peso / dd.peso_total;
            const rateio = share * frete;
            previstoPorVend.set(vid, (previstoPorVend.get(vid) ?? 0) + rateio);
            pesoPorVend.set(vid, (pesoPorVend.get(vid) ?? 0) + vData.peso);
            const arr = pedidosPorVend.get(vid) ?? [];
            arr.push(...vData.pedidos);
            pedidosPorVend.set(vid, arr);
          }
        }

        const destinosSemTarifa = destinosArr.filter((d) => d.sem_tarifa).length;
        const realizadoCarga = cte ? cte.valor : null;

        for (const vid of vendsSet) {
          const peso_vend = pesoPorVend.get(vid) ?? 0;
          const previsto_vend = previstoPorVend.get(vid) ?? 0;
          // Realizado proporcional ao share do previsto da carga (ou peso se previsto=0)
          let realizado_vend: number | null = null;
          if (realizadoCarga != null) {
            if (previstoCarga > 0) realizado_vend = (previsto_vend / previstoCarga) * realizadoCarga;
            else if (cd.peso_total > 0) realizado_vend = (peso_vend / cd.peso_total) * realizadoCarga;
            else realizado_vend = 0;
          }
          const meta = vendMap.get(vid);
          const cur = acc.get(vid) ?? {
            vendedor_id: vid,
            nome_vendedor: meta?.nome ?? "—",
            codigo_vendedor: meta?.codigo ?? "",
            peso_kg: 0,
            frete_previsto: 0,
            frete_realizado: 0,
            cargas_count: 0,
            ctes_count: 0,
            cobertura_cte_pct: 0,
            detalhes: [],
          };
          cur.peso_kg += peso_vend;
          cur.frete_previsto += previsto_vend;
          if (realizado_vend != null) cur.frete_realizado += realizado_vend;

          const setC = cargasPorVend.get(vid) ?? new Set<string>();
          setC.add(cid);
          cargasPorVend.set(vid, setC);
          if (cte) {
            const setCte = cargasComCtePorVend.get(vid) ?? new Set<string>();
            setCte.add(cid);
            cargasComCtePorVend.set(vid, setCte);
          }

          const div_pct = realizado_vend != null && previsto_vend > 0
            ? ((realizado_vend - previsto_vend) / previsto_vend) * 100
            : null;

          cur.detalhes.push({
            carga_id: cid,
            nome_carga: cd.nome_carga,
            ordem_carga: cd.ordem_carga,
            data: cd.data,
            tipo_caminhao: cd.tipo_caminhao,
            tipo_veiculo_normalizado: cd.tipo_norm,
            tipo_frete_carga: tipoFreteCarga,
            peso_vendedor_kg: peso_vend,
            peso_total_carga_kg: cd.peso_total,
            previsto: previsto_vend,
            realizado: realizado_vend,
            divergencia_pct: div_pct,
            numero_cte: cte?.numero ?? null,
            vendedores_na_carga: vendsSet.size,
            destinos_sem_tarifa: destinosSemTarifa,
            destinos: destinosArr,
            pedidos: (pedidosPorVend.get(vid) ?? []).slice().sort(
              (a, b) => (a.numero_pedido ?? 0) - (b.numero_pedido ?? 0),
            ),
          });
          acc.set(vid, cur);
        }
      }

      for (const [vid, g] of acc) {
        g.cargas_count = cargasPorVend.get(vid)?.size ?? 0;
        g.ctes_count = cargasComCtePorVend.get(vid)?.size ?? 0;
        g.cobertura_cte_pct = g.cargas_count > 0 ? (g.ctes_count / g.cargas_count) * 100 : 0;
        g.detalhes.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
      }

      const vendedores = Array.from(acc.values()).sort((a, b) => b.frete_previsto - a.frete_previsto);
      return { vendedores, cobertura };
    },
  });
}
