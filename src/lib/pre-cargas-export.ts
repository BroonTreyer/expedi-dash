import * as XLSX from "xlsx";
import { temRuptura } from "@/lib/ruptura-utils";
import { pesoEfetivo, pesoNaoCarregado } from "@/lib/peso-utils";
import type { Carregamento } from "@/hooks/useCarregamentos";

type Item = Carregamento & { ruptura_sinalizada?: boolean };

export interface PedidoGrupo {
  numero_pedido: number;
  cliente: string | null;
  codigo_cliente: string | null;
  cidade: string | null;
  uf: string | null;
  vendedor: string | null;
  itens: Item[];
  pesoTotal: number;
  pesoEmbarcado: number;
  pesoRuptura: number;
  qtdRupturas: number;
}

export interface PreCargaGrupo {
  cargaId: string;
  nomeCarga: string | null;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  tipoCaminhao: string | null;
  ordemCarga: string | null;
  data: string;
  pedidos: PedidoGrupo[];
  destinos: string;
  qtdPedidos: number;
  pesoTotal: number;
  pesoEmbarcado: number;
  pesoRuptura: number;
  qtdRupturas: number;
}

function fmtData(d: string) {
  try { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; } catch { return d; }
}
function num(n: number) { return Number((n ?? 0).toFixed(3)); }
function sanitize(name: string) { return name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80); }
function setCols(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((w) => ({ wch: w }));
}
function applyNumFormat(ws: XLSX.WorkSheet, cols: string[], startRow: number, endRow: number, fmt = "#,##0.000") {
  for (const c of cols) {
    for (let r = startRow; r <= endRow; r++) {
      const addr = `${c}${r}`;
      const cell = (ws as any)[addr];
      if (cell && typeof cell.v === "number") cell.z = fmt;
    }
  }
}

export function exportarPreCargaUnica(carga: PreCargaGrupo) {
  const wb = XLSX.utils.book_new();

  // Agrupa por cliente (mesmo formato do fechamento de carga)
  const header = ["#", "CÓDIGO", "NOME", "CIDADE", "UF", "PESO", "VENDEDOR"];
  const rows: (string | number)[][] = [header];

  type Grupo = {
    codigo: string;
    nome: string;
    cidade: string;
    uf: string;
    peso: number;
    vendedores: Set<string>;
  };
  const grupos = new Map<string, Grupo>();
  const ordem: string[] = [];

  for (const p of carga.pedidos) {
    const key = (p.codigo_cliente?.trim() || p.cliente?.trim() || `__${p.numero_pedido}`).toLowerCase();
    let g = grupos.get(key);
    if (!g) {
      g = {
        codigo: p.codigo_cliente ?? "",
        nome: p.cliente ?? "Sem cliente",
        cidade: p.cidade ?? "",
        uf: p.uf ?? "",
        peso: 0,
        vendedores: new Set<string>(),
      };
      grupos.set(key, g);
      ordem.push(key);
    }
    for (const it of p.itens) {
      g.peso += pesoEfetivo(it);
    }
    if (p.vendedor) g.vendedores.add(p.vendedor);
  }

  let totalPeso = 0;
  ordem.forEach((k, i) => {
    const g = grupos.get(k)!;
    totalPeso += g.peso;
    rows.push([
      `${i + 1}º`,
      g.codigo,
      g.nome,
      g.cidade,
      g.uf,
      num(g.peso),
      Array.from(g.vendedores).join(", "),
    ]);
  });
  rows.push(["", "", "", "", "", num(totalPeso), ""]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  setCols(ws, [5, 10, 35, 22, 5, 10, 15]);
  applyNumFormat(ws, ["F"], 2, rows.length);
  XLSX.utils.book_append_sheet(wb, ws, "Pré-carga");

  const nome = sanitize(carga.nomeCarga || carga.cargaId);
  XLSX.writeFile(wb, `pre-carga_${nome}_${carga.data}.xlsx`);
}

export function exportarPreCargasResumo(cargas: PreCargaGrupo[]) {
  const wb = XLSX.utils.book_new();

  const totQtdCargas = cargas.length;
  const totPedidos = cargas.reduce((s, c) => s + c.qtdPedidos, 0);
  const totPesoTotal = cargas.reduce((s, c) => s + c.pesoTotal, 0);
  const totEmb = cargas.reduce((s, c) => s + c.pesoEmbarcado, 0);
  const totRup = cargas.reduce((s, c) => s + c.pesoRuptura, 0);
  const totItensRup = cargas.reduce((s, c) => s + c.qtdRupturas, 0);
  const datas = cargas.map((c) => c.data).sort();
  const periodo = datas.length ? `${fmtData(datas[0])} a ${fmtData(datas[datas.length - 1])}` : "—";

  const resumo = [
    ["Resumo geral de pré-cargas"],
    ["Período", periodo],
    ["Gerado em", new Date().toLocaleString("pt-BR")],
    [],
    ["Qtd pré-cargas", totQtdCargas],
    ["Qtd pedidos", totPedidos],
    ["Peso total (kg)", num(totPesoTotal)],
    ["Peso embarcado (kg)", num(totEmb)],
    ["Peso em ruptura (kg)", num(totRup)],
    ["Itens em ruptura", totItensRup],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  setCols(wsResumo, [24, 40]);
  applyNumFormat(wsResumo, ["B"], 7, 9);
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo geral");

  const cargasHeader = ["ID", "Nome", "Data", "Placa", "Motorista", "Transportadora", "Tipo", "Ordem", "Destinos", "Qtd pedidos", "Peso total (kg)", "Peso embarcado (kg)", "Peso ruptura (kg)", "Qtd rupturas"];
  const cargasRows = cargas.map((c) => [
    c.cargaId, c.nomeCarga ?? "", fmtData(c.data), c.placa ?? "", c.motorista ?? "",
    c.transportadora ?? "", c.tipoCaminhao ?? "", c.ordemCarga ?? "", c.destinos,
    c.qtdPedidos, num(c.pesoTotal), num(c.pesoEmbarcado), num(c.pesoRuptura), c.qtdRupturas,
  ]);
  const wsCargas = XLSX.utils.aoa_to_sheet([cargasHeader, ...cargasRows]);
  setCols(wsCargas, [16, 22, 12, 12, 22, 22, 16, 12, 40, 12, 18, 18, 18, 14]);
  applyNumFormat(wsCargas, ["K", "L", "M"], 2, cargasRows.length + 1);
  XLSX.utils.book_append_sheet(wb, wsCargas, "Cargas");

  const pedidosHeader = ["Carga", "Data", "Pedido", "Cliente", "Cód. cliente", "Cidade", "UF", "Vendedor", "Peso embarcado (kg)", "Peso ruptura (kg)", "Qtd rupturas"];
  const pedidosRows: (string | number)[][] = [];
  for (const c of cargas) {
    for (const p of c.pedidos) {
      pedidosRows.push([
        c.nomeCarga || c.cargaId, fmtData(c.data), p.numero_pedido, p.cliente ?? "",
        p.codigo_cliente ?? "", p.cidade ?? "", p.uf ?? "", p.vendedor ?? "",
        num(p.pesoEmbarcado), num(p.pesoRuptura), p.qtdRupturas,
      ]);
    }
  }
  const wsPed = XLSX.utils.aoa_to_sheet([pedidosHeader, ...pedidosRows]);
  setCols(wsPed, [22, 12, 10, 32, 14, 22, 6, 22, 18, 18, 14]);
  applyNumFormat(wsPed, ["I", "J"], 2, pedidosRows.length + 1);
  XLSX.utils.book_append_sheet(wb, wsPed, "Pedidos");

  const rupHeader = ["Carga", "Data", "Pedido", "Cliente", "Cód. produto", "Produto", "Tipo", "Peso original (kg)", "Disponível (kg)", "Ruptura (kg)", "Motivo"];
  const rupRows: (string | number)[][] = [];
  for (const c of cargas) {
    for (const p of c.pedidos) {
      for (const it of p.itens) {
        if (!temRuptura(it)) continue;
        const carregado = pesoEfetivo(it);
        const diff = pesoNaoCarregado(it);
        const original = carregado + diff;
        rupRows.push([
          c.nomeCarga || c.cargaId, fmtData(c.data), p.numero_pedido, p.cliente ?? "",
          it.codigo_produto ?? "", it.nome_produto ?? "",
          it.ruptura ? "Total" : "Parcial", num(original), num(carregado), num(diff),
          it.motivo_ruptura ?? "",
        ]);
      }
    }
  }
  const wsRup = XLSX.utils.aoa_to_sheet([rupHeader, ...rupRows]);
  setCols(wsRup, [22, 12, 10, 32, 14, 36, 10, 18, 18, 18, 30]);
  applyNumFormat(wsRup, ["H", "I", "J"], 2, rupRows.length + 1);
  XLSX.utils.book_append_sheet(wb, wsRup, "Rupturas");

  const hoje = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `pre-cargas_resumo_${hoje}.xlsx`);
}