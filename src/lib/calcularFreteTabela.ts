// Helper puro para calcular frete usando tabelas_frete_itens.
// Cascata: (cliente+cidade+uf) → (cidade+uf) → (uf cidade=null).

export type ItemTabelaFrete = {
  tabela_id: string;
  codigo_cliente: string | null;
  destino_cidade: string | null;
  destino_uf: string;
  valor_kg_bitruck: number;
  valor_kg_carreta: number;
  ativo: boolean;
};

export type DestinoFrete = {
  cidade: string | null;
  uf: string | null;
  peso: number;
  codigo_cliente?: string | null;
  nomeCliente?: string | null;
};

export type DetalheFrete = {
  cliente: string | null;
  cidade: string | null;
  uf: string | null;
  peso: number;
  valor_kg: number;
  subtotal: number;
  status: "ok" | "sem_tarifa" | "conflito";
};

export type ResultadoFrete = {
  total: number;
  detalhes: DetalheFrete[];
  semTarifa: number;
  conflitos: number;
};

const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

const ehBitruck = (tipo: string | null | undefined) =>
  /bi[-\s]?truck|bitruck/i.test(tipo ?? "");

export function calcularFreteTabela(
  destinos: DestinoFrete[],
  itens: ItemTabelaFrete[],
  tipoCaminhao: string | null | undefined,
): ResultadoFrete {
  const usaBitruck = ehBitruck(tipoCaminhao);
  const valor = (i: ItemTabelaFrete) =>
    Number(usaBitruck ? i.valor_kg_bitruck : i.valor_kg_carreta) || 0;

  const ativos = itens.filter((i) => i.ativo);

  const detalhes: DetalheFrete[] = [];
  let total = 0;
  let semTarifa = 0;
  let conflitos = 0;
  const TOL = 0.001;

  for (const d of destinos) {
    const cidade = norm(d.cidade);
    const uf = norm(d.uf);
    const cli = (d.codigo_cliente ?? "").trim();

    // Níveis de match
    const niveis: ItemTabelaFrete[][] = [[], [], []];
    for (const it of ativos) {
      if (norm(it.destino_uf) !== uf) continue;
      if (cli && it.codigo_cliente && it.codigo_cliente.trim() === cli &&
          norm(it.destino_cidade) === cidade && cidade) {
        niveis[0].push(it);
      } else if (norm(it.destino_cidade) === cidade && cidade && !it.codigo_cliente) {
        niveis[1].push(it);
      } else if (!it.destino_cidade) {
        niveis[2].push(it);
      }
    }

    let valor_kg = 0;
    let status: DetalheFrete["status"] = "sem_tarifa";
    for (const lvl of niveis) {
      if (lvl.length === 0) continue;
      const vals = lvl.map(valor).filter((v) => v > 0);
      if (vals.length === 0) continue;
      const mn = Math.min(...vals);
      const mx = Math.max(...vals);
      if (mx - mn > TOL) {
        status = "conflito";
        valor_kg = 0;
      } else {
        status = "ok";
        valor_kg = vals[0];
      }
      break;
    }

    const subtotal = valor_kg * (d.peso || 0);
    if (status === "ok") total += subtotal;
    if (status === "sem_tarifa") semTarifa += 1;
    if (status === "conflito") conflitos += 1;

    detalhes.push({
      cliente: d.nomeCliente ?? null,
      cidade: d.cidade,
      uf: d.uf,
      peso: d.peso,
      valor_kg,
      subtotal,
      status,
    });
  }

  return { total, detalhes, semTarifa, conflitos };
}
