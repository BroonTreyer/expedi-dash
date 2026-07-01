import * as XLSX from "xlsx";
import type { Carregamento } from "@/hooks/useCarregamentos";
import { pesoEfetivo, pesoNaoCarregado, quantidadeNaoCarregada, isRupturaParcial } from "@/lib/peso-utils";

export interface ConsolidadoGroupExport {
  cargaId: string;
  nomeCarga: string | null;
  ordemCarga: string | null;
  placa: string | null;
  motorista: string | null;
  tipoCaminhao: string | null;
  tipoFrete: string;
  pesoTotal: number;
  pesoPlanejado: number;
  pesoCortado: number;
  qtdPedidos: number;
  rupturaCount: number;
  parcialCount: number;
  clientes: Set<string>;
  ufs: Set<string>;
  status: string;
  data: string;
  items: Carregamento[];
}

export interface ConsolidadoExportMeta {
  dateFrom: string;
  dateTo: string;
  ordemCarga?: string;
  filtros: {
    uf?: string;
    status?: string;
    etapaPortaria?: string;
  };
  etapaPortariaByCarga?: Map<string, string>; // key = `${cargaId}||${placa ?? ""}`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((wch) => ({ wch }));
}

function boldHeaderRow(ws: XLSX.WorkSheet, rowIndex: number, cols: number) {
  for (let c = 0; c < cols; c++) {
    const addr = XLSX.utils.encode_cell({ r: rowIndex, c });
    const cell = ws[addr];
    if (!cell) continue;
    cell.s = { font: { bold: true } };
  }
}

function applyNumberFormat(ws: XLSX.WorkSheet, colIndexes: number[], startRow: number, endRow: number, fmt = "#,##0") {
  for (let r = startRow; r <= endRow; r++) {
    for (const c of colIndexes) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell && typeof cell.v === "number") cell.z = fmt;
    }
  }
}

export function exportConsolidadoXLSX(
  groups: ConsolidadoGroupExport[],
  rawItems: Carregamento[],
  meta: ConsolidadoExportMeta,
) {
  const wb = XLSX.utils.book_new();

  // ============ Aba 1 — Resumo ============
  const periodo = meta.ordemCarga
    ? `Ordem de Carga: ${meta.ordemCarga}`
    : meta.dateFrom === meta.dateTo
      ? `Data: ${fmtDate(meta.dateFrom)}`
      : `Período: ${fmtDate(meta.dateFrom)} a ${fmtDate(meta.dateTo)}`;

  const filtrosStr = [
    meta.filtros.uf && meta.filtros.uf !== "todos" ? `UF: ${meta.filtros.uf}` : null,
    meta.filtros.status && meta.filtros.status !== "todos" ? `Status: ${meta.filtros.status}` : null,
    meta.filtros.etapaPortaria && meta.filtros.etapaPortaria !== "todas" ? `Portaria: ${meta.filtros.etapaPortaria}` : null,
  ].filter(Boolean).join(" | ") || "Nenhum filtro adicional";

  const totalVeiculos = groups.length;
  const totalPedidos = groups.reduce((s, g) => s + g.qtdPedidos, 0);
  const totalPeso = groups.reduce((s, g) => s + g.pesoTotal, 0);
  const totalPlanejado = groups.reduce((s, g) => s + g.pesoPlanejado, 0);
  const totalCortado = groups.reduce((s, g) => s + g.pesoCortado, 0);
  const totalRupturas = groups.reduce((s, g) => s + g.rupturaCount, 0);
  const totalParciais = groups.reduce((s, g) => s + g.parcialCount, 0);

  const resumoRows: any[][] = [
    ["Consolidado de Cargas"],
    [periodo],
    [filtrosStr],
    [],
    ["Veículos", totalVeiculos, "Pedidos", totalPedidos, "Peso Efetivo (kg)", totalPeso, "Peso Planejado (kg)", totalPlanejado, "Peso Cortado (kg)", totalCortado, "Rupturas", totalRupturas, "Parciais", totalParciais],
    [],
    ["Data", "Nome Carga", "OC", "Placa", "Motorista", "Tipo Caminhão", "Transportadora", "Tipo Frete", "Status", "Etapa Portaria", "Peso Efetivo (kg)", "Peso Planejado (kg)", "Peso Cortado (kg)", "Qtd Pedidos", "Rupturas", "Parciais", "Qtd Clientes", "UFs"],
  ];

  const sortedGroups = [...groups].sort((a, b) => {
    const d = (a.data || "").localeCompare(b.data || "");
    if (d !== 0) return d;
    return (a.nomeCarga || a.cargaId).localeCompare(b.nomeCarga || b.cargaId);
  });

  const headerRowIdx = resumoRows.length - 1;

  for (const g of sortedGroups) {
    const transportadora = g.items[0]?.transportadora ?? "";
    const etapa = meta.etapaPortariaByCarga?.get(`${g.cargaId}||${g.placa ?? ""}`) ?? "";
    resumoRows.push([
      fmtDate(g.data),
      g.nomeCarga ?? g.cargaId,
      g.ordemCarga ?? "",
      g.placa ?? "",
      g.motorista ?? "",
      g.tipoCaminhao ?? "",
      transportadora,
      g.tipoFrete,
      g.status,
      etapa,
      Math.round(g.pesoTotal),
      Math.round(g.pesoPlanejado),
      Math.round(g.pesoCortado),
      g.qtdPedidos,
      g.rupturaCount,
      g.parcialCount,
      g.clientes.size,
      [...g.ufs].sort().join(", "),
    ]);
  }

  resumoRows.push([]);
  resumoRows.push([
    "TOTAIS", "", "", "", "", "", "", "", "", "",
    Math.round(totalPeso), Math.round(totalPlanejado), Math.round(totalCortado),
    totalPedidos, totalRupturas, totalParciais, "", "",
  ]);

  const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows);
  setColWidths(wsResumo, [12, 26, 12, 12, 24, 16, 22, 14, 14, 16, 16, 16, 16, 12, 10, 10, 12, 14]);
  boldHeaderRow(wsResumo, headerRowIdx, 18);
  boldHeaderRow(wsResumo, resumoRows.length - 1, 18);
  applyNumberFormat(wsResumo, [10, 11, 12, 13, 14, 15, 16], headerRowIdx + 1, resumoRows.length - 1);
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // ============ Aba 2 — Pedidos ============
  const cargaIdsFiltrados = new Set(sortedGroups.map((g) => `${g.cargaId}__${g.data}__${g.placa ?? ""}`));
  const pedidosItems = rawItems
    .filter((it) => {
      if (!it.carga_id) return false;
      // Manter apenas itens dos grupos que aparecem na tela.
      // Usa chave composta igual ao groupByCarga.
      const k = `${it.carga_id}__${it.data ?? ""}__${it.placa ?? ""}`;
      // Data pode ter sido reescrita por data efetiva, mas para pedidos vamos manter a original.
      // Verifica por qualquer cargaId presente:
      return sortedGroups.some((g) => g.cargaId === it.carga_id && (g.placa ?? "") === (it.placa ?? ""));
    })
    .sort((a, b) => {
      const d = (a.data || "").localeCompare(b.data || "");
      if (d !== 0) return d;
      const n = (a.nome_carga || a.carga_id || "").localeCompare(b.nome_carga || b.carga_id || "");
      if (n !== 0) return n;
      return String(a.numero_pedido || "").localeCompare(String(b.numero_pedido || ""));
    });

  const pedidosHeader = ["Data", "Nome Carga", "OC", "Placa", "Motorista", "Transportadora", "Nº Pedido", "Cliente", "Cód. Cliente", "UF", "Cidade", "Produto", "Cód. Produto", "Peso (kg)", "Quantidade", "Ruptura", "Peso Não Carregado", "Qtd Não Carregada", "Vendedor", "Observações"];
  const pedidosRows: any[][] = [pedidosHeader];

  for (const it of pedidosItems) {
    const efetivo = pesoEfetivo({ peso: it.peso, ruptura: !!it.ruptura });
    pedidosRows.push([
      fmtDate(it.data),
      it.nome_carga ?? it.carga_id ?? "",
      (it as any).ordem_carga ?? "",
      it.placa ?? "",
      it.motorista ?? "",
      it.transportadora ?? "",
      it.numero_pedido ?? "",
      it.cliente ?? "",
      it.codigo_cliente ?? "",
      it.uf ?? "",
      (it as any).cidade ?? "",
      it.nome_produto ?? "",
      it.codigo_produto ?? "",
      Math.round(efetivo),
      Number(it.quantidade ?? 0),
      it.ruptura ? "Sim" : "",
      isRupturaParcial(it) ? Math.round(pesoNaoCarregado(it)) : 0,
      isRupturaParcial(it) ? Number(quantidadeNaoCarregada(it) ?? 0) : 0,
      (it as any).vendedores?.nome_vendedor ?? "",
      it.observacoes ?? "",
    ]);
  }

  const wsPedidos = XLSX.utils.aoa_to_sheet(pedidosRows);
  setColWidths(wsPedidos, [12, 22, 12, 12, 22, 20, 12, 30, 12, 6, 20, 30, 14, 12, 12, 10, 16, 16, 22, 30]);
  boldHeaderRow(wsPedidos, 0, pedidosHeader.length);
  applyNumberFormat(wsPedidos, [13, 14, 16, 17], 1, pedidosRows.length - 1);
  XLSX.utils.book_append_sheet(wb, wsPedidos, "Pedidos");

  // ============ Aba 3 — Rupturas ============
  const rupturas = pedidosItems.filter((it) => !!it.ruptura);
  const pct = pedidosItems.length > 0 ? ((rupturas.length / pedidosItems.length) * 100).toFixed(1) : "0.0";
  const rupturasRows: any[][] = [
    ["Rupturas"],
    [periodo],
    [`${rupturas.length} ruptura(s) de ${pedidosItems.length} pedidos (${pct}%)`],
    [],
    pedidosHeader,
  ];

  for (const it of rupturas) {
    rupturasRows.push([
      fmtDate(it.data),
      it.nome_carga ?? it.carga_id ?? "",
      (it as any).ordem_carga ?? "",
      it.placa ?? "",
      it.motorista ?? "",
      it.transportadora ?? "",
      it.numero_pedido ?? "",
      it.cliente ?? "",
      it.codigo_cliente ?? "",
      it.uf ?? "",
      (it as any).cidade ?? "",
      it.nome_produto ?? "",
      it.codigo_produto ?? "",
      0,
      0,
      "Sim",
      Math.round(pesoNaoCarregado(it) || Number(it.peso ?? 0)),
      Number(quantidadeNaoCarregada(it) ?? it.quantidade ?? 0),
      (it as any).vendedores?.nome_vendedor ?? "",
      it.observacoes ?? "",
    ]);
  }

  const wsRupt = XLSX.utils.aoa_to_sheet(rupturasRows);
  setColWidths(wsRupt, [12, 22, 12, 12, 22, 20, 12, 30, 12, 6, 20, 30, 14, 12, 12, 10, 16, 16, 22, 30]);
  boldHeaderRow(wsRupt, 4, pedidosHeader.length);
  applyNumberFormat(wsRupt, [13, 14, 16, 17], 5, rupturasRows.length - 1);
  XLSX.utils.book_append_sheet(wb, wsRupt, "Rupturas");

  const filename = meta.ordemCarga
    ? `consolidado_oc_${meta.ordemCarga.replace(/[^\w-]+/g, "_")}.xlsx`
    : meta.dateFrom === meta.dateTo
      ? `consolidado_${meta.dateFrom}.xlsx`
      : `consolidado_${meta.dateFrom}_${meta.dateTo}.xlsx`;

  XLSX.writeFile(wb, filename);
}