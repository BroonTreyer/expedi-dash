// Utilitários de peso para Recebimento MP.
// Banco SEMPRE armazena peso em toneladas (ton).

export type UnidadePeso = "ton" | "kg";

export function normalizarParaTon(valor: number, unidade: UnidadePeso): number {
  if (!isFinite(valor) || valor <= 0) return 0;
  return unidade === "kg" ? valor / 1000 : valor;
}

/** Heurística: se média > 100, provavelmente está em kg. */
export function detectarUnidade(valores: number[]): UnidadePeso {
  if (!valores.length) return "ton";
  const validos = valores.filter((v) => v > 0);
  if (!validos.length) return "ton";
  const media = validos.reduce((a, b) => a + b, 0) / validos.length;
  return media > 100 ? "kg" : "ton";
}

export function formatarTon(n: number): string {
  return `${(n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ton`;
}

export function formatarBRL(n: number): string {
  return (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Parse de input pt-BR ("1.234,56" => 1234.56). */
export function parseNumeroBR(s: string): number {
  if (!s) return 0;
  const n = Number(String(s).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

export const LIMITE_SUSPEITO_TON = 100;