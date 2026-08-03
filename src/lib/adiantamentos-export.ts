import * as XLSX from "xlsx";
import type { Adiantamento } from "@/hooks/useAdiantamentos";

const fmtDataBR = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
};

const statusLabel = (s: string) =>
  ({ pendente: "Pendente", pago: "Pago (aguardando quitação)", quitado: "Quitado", cancelado: "Cancelado" } as Record<string, string>)[s] ?? s;

const ocLabel = (a: Adiantamento) =>
  a.tipo_agrupamento === "ordem" && a.ordem_carga ? a.ordem_carga : `Lote ${a.numero}`;

export function exportarAdiantamentosXLSX(lista: Adiantamento[], sufixo = "") {
  const header = [
    "Número",
    "Transportadora",
    "Ordem de Carga",
    "Qtd CT-e",
    "CT-es",
    "Peso Total (kg)",
    "Valor Total CT-es (R$)",
    "% Adiantamento",
    "Valor Adiantamento (R$)",
    "Valor Saldo (R$)",
    "Status",
    "Data Pagamento",
    "Data Quitação",
    "Observações",
  ];

  const rows = lista.map((a) => [
    a.numero,
    a.transportadora,
    ocLabel(a),
    Number(a.qtd_ctes || 0),
    (a.cteNumbers ?? []).join(" / "),
    Number(a.peso_total || 0),
    Number(a.valor_total_ctes || 0),
    Number(a.percentual || 0),
    Number(a.valor_adiantamento || 0),
    Number(a.valor_saldo || 0),
    statusLabel(a.status),
    fmtDataBR(a.pago_em),
    fmtDataBR(a.quitado_em),
    a.observacoes ?? "",
  ]);

  const sum = (f: (a: Adiantamento) => number) => lista.reduce((s, a) => s + f(a), 0);
  const totais = [
    "TOTAIS",
    "",
    "",
    sum((a) => Number(a.qtd_ctes || 0)),
    "",
    sum((a) => Number(a.peso_total || 0)),
    sum((a) => Number(a.valor_total_ctes || 0)),
    "",
    sum((a) => Number(a.valor_adiantamento || 0)),
    sum((a) => Number(a.valor_saldo || 0)),
    "",
    "",
    "",
    "",
  ];

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows, [], totais]);
  ws["!cols"] = [
    { wch: 20 }, { wch: 34 }, { wch: 18 }, { wch: 10 }, { wch: 28 },
    { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 20 }, { wch: 16 },
    { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 40 },
  ];

  const numFmtBRL = "#,##0.00";
  const range = XLSX.utils.decode_range(ws["!ref"]!);
  for (let R = 1; R <= range.e.r; R++) {
    for (const C of [5, 6, 8, 9]) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && typeof cell.v === "number") cell.z = numFmtBRL;
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Adiantamentos");
  const hoje = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `adiantamentos${sufixo ? `_${sufixo}` : ""}_${hoje}.xlsx`);
}
