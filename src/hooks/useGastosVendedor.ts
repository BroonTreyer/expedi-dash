import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useAuth";

export type TabelaDivergente = { tabela_id: string; nome: string; valor_kg: number };

export type DestinoDetalhe = {
  cidade: string;
  uf: string;
  peso: number;
  valor_kg: number;       // 0 quando sem_tarifa ou conflito
  frete: number;          // 0 quando sem_tarifa ou conflito
  sem_tarifa: boolean;
  conflito: boolean;
  tabelas_divergentes: TabelaDivergente[];
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
  destinos_em_conflito: number;
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
  cif: number; fob: number; misto: number; nao_classificado: number; total: number;
};

export type GastosVendedorResult = {
  vendedores: GastoVendedor[];
  cobertura: CoberturaTipoFrete;
};

function normalizeTipo(t: string | null | undefined): "bitruck" | "carreta" {
  const s = (t ?? "").toLowerCase();
  if (s.includes("carreta")) return "carreta";
  return "bitruck";
}
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const TOL = 0.01;

export function useGastosVendedor(dataInicial: string, dataFinal: string) {
  const session = useSession();
  return useQuery({
    queryKey: ["gastos_vendedor_v5_tabelas", dataInicial, dataFinal],
    enabled: !!session,
    staleTime: 30_000,
    queryFn: async (): Promise<GastosVendedorResult> => {
      const { data: items, error: iErr } = await supabase
        .from("carregamentos_dia")
        .select("carga_id, nome_carga, ordem_carga, data, tipo_caminhao, tipo_frete, vendedor_id, peso, numero_pedido, cliente, codigo_cliente, cidade, uf")
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
      const vendIdsSet = new Set<string>();
      for (const it of items as any[]) if (it.vendedor_id) vendIdsSet.add(it.vendedor_id);

      const [tabRes, vincRes, itensRes, vendRes, ctesRes] = await Promise.all([
        (supabase as any).from("tabelas_frete").select("id, nome, ativo"),
        (supabase as any).from("vendedor_tabelas_frete").select("vendedor_id, tabela_id"),
        (supabase as any).from("tabelas_frete_itens").select("tabela_id, codigo_cliente, destino_cidade, destino_uf, valor_kg_bitruck, valor_kg_carreta, ativo"),
        supabase.from("vendedores").select("id, codigo_vendedor, nome_vendedor"),
        (supabase as any).from("ctes_dacte").select("numero_cte, valor_frete, carga_id, status").in("carga_id", cargaIds),
      ]);

      const tabNome = new Map<string, string>();
      const tabAtiva = new Set<string>();
      for (const t of (tabRes.data ?? []) as any[]) {
        tabNome.set(t.id, t.nome);
        if (t.ativo !== false) tabAtiva.add(t.id);
      }

      // vendedor_id -> [tabela_id]
      const vendTabelas = new Map<string, string[]>();
      for (const v of (vincRes.data ?? []) as any[]) {
        if (!tabAtiva.has(v.tabela_id)) continue;
        const arr = vendTabelas.get(v.vendedor_id) ?? [];
        arr.push(v.tabela_id);
        vendTabelas.set(v.vendedor_id, arr);
      }

      // tabela_id -> { byCidade: Map<cidade|UF, DestEntry>, byUF: Map<UF, DestEntry> }
      type ItemRow = { valor_kg_bitruck: number; valor_kg_carreta: number };
      type DestEntry = { generic?: ItemRow; porCliente: Map<string, ItemRow> };
      type TabIdx = { byCidade: Map<string, DestEntry>; byUF: Map<string, DestEntry> };
      const tabIndex = new Map<string, TabIdx>();
      for (const i of (itensRes.data ?? []) as any[]) {
        if (i.ativo === false) continue;
        const uf = (i.destino_uf ?? "").toUpperCase();
        if (!uf) continue;
        let tm = tabIndex.get(i.tabela_id);
        if (!tm) { tm = { byCidade: new Map(), byUF: new Map() }; tabIndex.set(i.tabela_id, tm); }
        const cidadeNorm = norm(i.destino_cidade);
        const target = cidadeNorm
          ? (() => {
              const k = `${cidadeNorm}|${uf}`;
              let de = tm!.byCidade.get(k);
              if (!de) { de = { porCliente: new Map() }; tm!.byCidade.set(k, de); }
              return de;
            })()
          : (() => {
              let de = tm!.byUF.get(uf);
              if (!de) { de = { porCliente: new Map() }; tm!.byUF.set(uf, de); }
              return de;
            })();
        const row: ItemRow = {
          valor_kg_bitruck: Number(i.valor_kg_bitruck) || 0,
          valor_kg_carreta: Number(i.valor_kg_carreta) || 0,
        };
        if (i.codigo_cliente) target.porCliente.set(String(i.codigo_cliente).trim(), row);
        else target.generic = row;
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

      // Precedência (mais específico vence): cliente+cidade+UF > cliente+UF > cidade+UF > UF.
      // Conflito é avaliado SOMENTE entre tabelas que respondem no mesmo nível.
      const resolverTarifa = (
        vendedorId: string,
        codigoCliente: string | null,
        cidade: string,
        uf: string,
        tipo: "bitruck" | "carreta",
      ): { valor_kg: number; conflito: boolean; divergentes: TabelaDivergente[] } | null => {
        const tabelas = vendTabelas.get(vendedorId);
        if (!tabelas || tabelas.length === 0) return null;
        const ufN = (uf ?? "").toUpperCase();
        const ckey = `${norm(cidade)}|${ufN}`;
        const cliente = codigoCliente?.trim() || null;

        // Por nível: respostas[level] = TabelaDivergente[]
        // 0 = cliente + cidade+UF, 1 = cliente + UF, 2 = cidade+UF (genérico), 3 = UF (genérico)
        const niveis: TabelaDivergente[][] = [[], [], [], []];
        for (const tid of tabelas) {
          const idx = tabIndex.get(tid);
          if (!idx) continue;
          const deCidade = idx.byCidade.get(ckey);
          const deUF = idx.byUF.get(ufN);
          const pick = (row: ItemRow | undefined, level: number) => {
            if (!row) return;
            const v = tipo === "bitruck" ? row.valor_kg_bitruck : row.valor_kg_carreta;
            niveis[level].push({ tabela_id: tid, nome: tabNome.get(tid) ?? "?", valor_kg: v });
          };
          // Para esta tabela, usa apenas o nível mais específico que ela oferece
          if (cliente && deCidade?.porCliente.get(cliente)) pick(deCidade.porCliente.get(cliente), 0);
          else if (cliente && deUF?.porCliente.get(cliente)) pick(deUF.porCliente.get(cliente), 1);
          else if (deCidade?.generic) pick(deCidade.generic, 2);
          else if (deUF?.generic) pick(deUF.generic, 3);
        }
        // Escolhe o nível mais específico com respostas
        for (const respostas of niveis) {
          if (respostas.length === 0) continue;
          const min = Math.min(...respostas.map((r) => r.valor_kg));
          const max = Math.max(...respostas.map((r) => r.valor_kg));
          if (max - min > TOL) return { valor_kg: 0, conflito: true, divergentes: respostas };
          return { valor_kg: respostas[0].valor_kg, conflito: false, divergentes: respostas };
        }
        return null;
      };

      // Agrupa pedidos por carga -> destino -> vendedor (mantendo codigo_cliente por vendedor/destino)
      type DestVendData = {
        peso: number;
        codigo_cliente: string | null;
        pedidos: Array<{ numero_pedido: number | null; cliente: string | null; cidade: string | null; uf: string | null; peso: number }>;
      };
      type DestData = { cidade: string; uf: string; peso_total: number; porVendedor: Map<string, DestVendData> };
      type CargaData = {
        nome_carga: string | null; ordem_carga: string | null; data: string | null;
        tipo_caminhao: string | null; tipo_norm: "bitruck" | "carreta";
        tipos_frete: Set<string>; peso_total: number; destinos: Map<string, DestData>;
      };

      const cargas = new Map<string, CargaData>();
      for (const it of items as any[]) {
        const cid = it.carga_id as string;
        if (!cid) continue;
        let cd = cargas.get(cid);
        if (!cd) {
          cd = {
            nome_carga: it.nome_carga ?? null, ordem_carga: it.ordem_carga ?? null, data: it.data ?? null,
            tipo_caminhao: it.tipo_caminhao ?? null, tipo_norm: normalizeTipo(it.tipo_caminhao),
            tipos_frete: new Set<string>(), peso_total: 0, destinos: new Map(),
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
        const dkey = `${norm(cidade)}|${(uf ?? "").toUpperCase()}`;
        let dd = cd.destinos.get(dkey);
        if (!dd) { dd = { cidade, uf: (uf ?? "").toUpperCase(), peso_total: 0, porVendedor: new Map() }; cd.destinos.set(dkey, dd); }
        dd.peso_total += peso;
        const vid = it.vendedor_id;
        if (!vid || peso <= 0) continue;
        let vd = dd.porVendedor.get(vid);
        if (!vd) { vd = { peso: 0, codigo_cliente: it.codigo_cliente ?? null, pedidos: [] }; dd.porVendedor.set(vid, vd); }
        vd.peso += peso;
        // se houver mais de um cliente no mesmo destino para o mesmo vendedor, mantém o primeiro;
        // o cliente influencia a busca, mas o destino é agregado.
        vd.pedidos.push({
          numero_pedido: it.numero_pedido ?? null,
          cliente: it.cliente ?? null,
          cidade, uf,
          peso,
        });
      }

      const acc = new Map<string, GastoVendedor>();
      const cargasPorVend = new Map<string, Set<string>>();
      const cargasComCtePorVend = new Map<string, Set<string>>();
      const cobertura: CoberturaTipoFrete = { cif: 0, fob: 0, misto: 0, nao_classificado: 0, total: 0 };

      for (const [cid, cd] of cargas) {
        let tipoFreteCarga: GastoDetalhe["tipo_frete_carga"];
        if (cd.tipos_frete.size === 0) tipoFreteCarga = "nao_classificado";
        else if (cd.tipos_frete.size > 1) tipoFreteCarga = "misto";
        else if (cd.tipos_frete.has("CIF")) tipoFreteCarga = "cif";
        else tipoFreteCarga = "fob";

        cobertura.total += 1;
        cobertura[tipoFreteCarga] += 1;

        if (tipoFreteCarga === "fob" || tipoFreteCarga === "misto") continue;

        const cte = cteMap.get(cid) ?? null;

        // Por vendedor: percorre cada destino e resolve tarifa específica vendedor+cliente+destino.
        // Acumuladores
        const previstoPorVend = new Map<string, number>();
        const pesoPorVend = new Map<string, number>();
        const pedidosPorVend = new Map<string, GastoDetalhe["pedidos"]>();
        const destinosPorVend = new Map<string, DestinoDetalhe[]>();
        const vendsSet = new Set<string>();
        let previstoCarga = 0;

        for (const [, dd] of cd.destinos) {
          for (const [vid, vData] of dd.porVendedor) {
            vendsSet.add(vid);
            const tarifa = resolverTarifa(vid, vData.codigo_cliente, dd.cidade, dd.uf, cd.tipo_norm);
            const sem_tarifa = tarifa == null;
            const conflito = !!tarifa?.conflito;
            const valor_kg = tarifa && !conflito ? tarifa.valor_kg : 0;
            const frete = vData.peso * valor_kg;
            previstoCarga += frete;
            previstoPorVend.set(vid, (previstoPorVend.get(vid) ?? 0) + frete);
            pesoPorVend.set(vid, (pesoPorVend.get(vid) ?? 0) + vData.peso);
            const pArr = pedidosPorVend.get(vid) ?? [];
            pArr.push(...vData.pedidos);
            pedidosPorVend.set(vid, pArr);
            const dArr = destinosPorVend.get(vid) ?? [];
            dArr.push({
              cidade: dd.cidade, uf: dd.uf, peso: vData.peso, valor_kg, frete,
              sem_tarifa, conflito,
              tabelas_divergentes: tarifa?.divergentes ?? [],
            });
            destinosPorVend.set(vid, dArr);
          }
        }

        const realizadoCarga = cte ? cte.valor : null;

        for (const vid of vendsSet) {
          const peso_vend = pesoPorVend.get(vid) ?? 0;
          const previsto_vend = previstoPorVend.get(vid) ?? 0;
          let realizado_vend: number | null = null;
          if (realizadoCarga != null) {
            if (previstoCarga > 0) realizado_vend = (previsto_vend / previstoCarga) * realizadoCarga;
            else if (cd.peso_total > 0) realizado_vend = (peso_vend / cd.peso_total) * realizadoCarga;
            else realizado_vend = 0;
          }
          const meta = vendMap.get(vid);
          const cur = acc.get(vid) ?? {
            vendedor_id: vid, nome_vendedor: meta?.nome ?? "—", codigo_vendedor: meta?.codigo ?? "",
            peso_kg: 0, frete_previsto: 0, frete_realizado: 0,
            cargas_count: 0, ctes_count: 0, cobertura_cte_pct: 0, detalhes: [],
          };
          cur.peso_kg += peso_vend;
          cur.frete_previsto += previsto_vend;
          if (realizado_vend != null) cur.frete_realizado += realizado_vend;

          const setC = cargasPorVend.get(vid) ?? new Set<string>();
          setC.add(cid); cargasPorVend.set(vid, setC);
          if (cte) {
            const setCte = cargasComCtePorVend.get(vid) ?? new Set<string>();
            setCte.add(cid); cargasComCtePorVend.set(vid, setCte);
          }

          const div_pct = realizado_vend != null && previsto_vend > 0
            ? ((realizado_vend - previsto_vend) / previsto_vend) * 100 : null;

          const destinos = destinosPorVend.get(vid) ?? [];

          cur.detalhes.push({
            carga_id: cid, nome_carga: cd.nome_carga, ordem_carga: cd.ordem_carga, data: cd.data,
            tipo_caminhao: cd.tipo_caminhao, tipo_veiculo_normalizado: cd.tipo_norm,
            tipo_frete_carga: tipoFreteCarga,
            peso_vendedor_kg: peso_vend, peso_total_carga_kg: cd.peso_total,
            previsto: previsto_vend, realizado: realizado_vend, divergencia_pct: div_pct,
            numero_cte: cte?.numero ?? null, vendedores_na_carga: vendsSet.size,
            destinos_sem_tarifa: destinos.filter((d) => d.sem_tarifa).length,
            destinos_em_conflito: destinos.filter((d) => d.conflito).length,
            destinos,
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
