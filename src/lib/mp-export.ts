import * as XLSX from "xlsx";

export function exportarXLSX(filename: string, sheets: Record<string, any[]>) {
  const wb = XLSX.utils.book_new();
  Object.entries(sheets).forEach(([name, rows]) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

export function fmtBRL(n: number) {
  return (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
export function fmtTon(n: number) {
  return (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}
export function fmtPct(n: number | null) {
  if (n == null || !isFinite(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}