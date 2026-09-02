import type { Adiantamento } from "@/hooks/useAdiantamentos";

export type GrupoAdt = {
  key: string;
  items: Adiantamento[];
  rep: Adiantamento; // representativo (mais recente)
  qtdCtes: number;
  /** Avisos de integridade: adiantamento órfão (sem CT-e) ou duplicado na OC. */
  alertas: string[];
  valorTotal: number;
  valorAdt: number;
  valorSaldo: number;
  pctMedio: number;
  statusUnico: Adiantamento["status"] | "misto";
  dataMin: string | null;
  dataMax: string | null;
  pagoMax: string | null;
  quitadoMax: string | null;
};

export function consolidarPorOC(data: Adiantamento[]): GrupoAdt[] {
  const map = new Map<string, Adiantamento[]>();
  for (const a of data) {
    const ocKey =
      a.tipo_agrupamento === "ordem" && a.ordem_carga && a.ordem_carga.trim()
        ? `OC|${a.transportadora}|${a.ordem_carga.trim()}`
        : `SOLO|${a.id}`;
    if (!map.has(ocKey)) map.set(ocKey, []);
    map.get(ocKey)!.push(a);
  }
  const grupos: GrupoAdt[] = [];
  for (const [key, items] of map.entries()) {
    const sorted = [...items].sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );
    const rep = sorted[0];
    // Cancelados não entram nos totais — senão um CT-e substituído continua
    // somando valor na OC (caso OC 132296).
    const ativos = items.filter((a) => a.status !== "cancelado");
    const base = ativos.length ? ativos : items;
    const valorTotal = base.reduce((s, a) => s + Number(a.valor_total_ctes || 0), 0);
    const valorAdt = base.reduce((s, a) => s + Number(a.valor_adiantamento || 0), 0);
    const valorSaldo = base.reduce((s, a) => s + Number(a.valor_saldo || 0), 0);
    const qtdCtes = base.reduce((s, a) => s + Number(a.qtd_ctes || 0), 0);
    // Integridade: adiantamento sem CT-e vinculado (órfão) ou duplicado na OC.
    const alertas: string[] = [];
    for (const a of ativos) {
      const vinculos = (a.cteNumbers ?? []).length;
      if (Number(a.qtd_ctes || 0) > 0 && vinculos === 0) {
        alertas.push(
          `${a.numero}: nenhum CT-e vinculado (registro órfão) — pode estar somando valor em duplicidade.`,
        );
      }
    }
    for (let i = 0; i < ativos.length; i++) {
      for (let j = i + 1; j < ativos.length; j++) {
        const x = ativos[i];
        const y = ativos[j];
        if (
          Number(x.valor_total_ctes || 0) > 0 &&
          Math.abs(Number(x.valor_total_ctes || 0) - Number(y.valor_total_ctes || 0)) <= 0.02
        ) {
          alertas.push(
            `${x.numero} e ${y.numero} têm o mesmo valor total (${x.valor_total_ctes}) — possível adiantamento duplicado.`,
          );
        }
      }
    }
    const pctMedio = valorTotal > 0 ? (valorAdt / valorTotal) * 100 : 0;
    const statuses = new Set(items.map((a) => a.status));
    const statusUnico = statuses.size === 1 ? items[0].status : "misto";
    const datas = items.map((a) => a.created_at).filter(Boolean) as string[];
    const pagos = items.map((a) => a.pago_em).filter(Boolean) as string[];
    const quitados = items.map((a) => a.quitado_em).filter(Boolean) as string[];
    grupos.push({
      key,
      items,
      rep,
      qtdCtes,
      alertas,
      valorTotal,
      valorAdt,
      valorSaldo,
      pctMedio,
      statusUnico,
      dataMin: datas.length ? datas.slice().sort()[0] : null,
      dataMax: datas.length ? datas.slice().sort().at(-1)! : null,
      pagoMax: pagos.length ? pagos.slice().sort().at(-1)! : null,
      quitadoMax: quitados.length ? quitados.slice().sort().at(-1)! : null,
    });
  }
  return grupos.sort((a, b) =>
    (b.dataMax ?? "").localeCompare(a.dataMax ?? ""),
  );
}
