import type { Adiantamento } from "@/hooks/useAdiantamentos";
import type { TransportadoraFinanceiro } from "@/hooks/useTransportadorasFinanceiro";
import { resolveTranspInfo } from "@/lib/transportadora-match";
import { consolidarPorOC, type GrupoAdt } from "@/lib/adiantamentos-consolidar";

export type ModoComprovante = "adiantamento" | "quitacao";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtKg = (n: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const ordCte = (a: string, b: string) => {
  const na = parseInt(String(a).replace(/\D/g, ""), 10);
  const nb = parseInt(String(b).replace(/\D/g, ""), 10);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a).localeCompare(String(b));
};

const ordOC = (a: GrupoAdt, b: GrupoAdt) => {
  const oa = a.rep.tipo_agrupamento === "ordem" ? a.rep.ordem_carga ?? "" : "";
  const ob = b.rep.tipo_agrupamento === "ordem" ? b.rep.ordem_carga ?? "" : "";
  if (oa && ob) return ordCte(oa, ob);
  if (oa) return -1;
  if (ob) return 1;
  return a.rep.numero.localeCompare(b.rep.numero);
};

export const rotuloGrupo = (g: GrupoAdt) =>
  g.rep.tipo_agrupamento === "ordem" && g.rep.ordem_carga
    ? `OC ${g.rep.ordem_carga}`
    : `Lote ${g.rep.numero}`;

/** Grupos por OC (só ativos), ordenados por número da OC. */
export function gruposParaComprovante(adiantamentos: Adiantamento[]): GrupoAdt[] {
  return consolidarPorOC(adiantamentos.filter((a) => a.status !== "cancelado")).sort(ordOC);
}

function linhasDoBloco(
  grupos: GrupoAdt[],
  modo: ModoComprovante,
  offset: number,
): string[] {
  const out: string[] = [];
  grupos.forEach((g, i) => {
    const ativos = g.items.filter((a) => a.status !== "cancelado");
    const peso = ativos.reduce((s, a) => s + Number(a.peso_total || 0), 0);
    const ctes = Array.from(new Set(ativos.flatMap((a) => a.cteNumbers ?? []))).sort(ordCte);
    const cteTxt = ctes.length ? ` CTE ${ctes.join("/")}` : "";
    const valor = modo === "quitacao" ? g.valorSaldo : g.valorTotal;
    out.push(`${offset + i + 1}. ${rotuloGrupo(g)} (${fmtKg(peso)} KG)${cteTxt} VLR ${fmtBRL(valor)}`);
  });
  return out;
}

function rodape(
  itens: Adiantamento[],
  modo: ModoComprovante,
  info: TransportadoraFinanceiro | null,
  nomeFallback: string,
): string[] {
  const out: string[] = [];
  const totalFrete = itens.reduce((s, a) => s + Number(a.valor_total_ctes || 0), 0);
  const totalAdt = itens.reduce((s, a) => s + Number(a.valor_adiantamento || 0), 0);
  const totalSaldo = itens.reduce((s, a) => s + Number(a.valor_saldo || 0), 0);
  if (modo === "quitacao") {
    out.push(`Valor Total a Quitar ${fmtBRL(totalSaldo)}`);
  } else {
    const pcts = Array.from(new Set(itens.map((a) => Number(a.percentual))));
    out.push(`Valor Total do Frete ${fmtBRL(totalFrete)}`);
    if (pcts.length === 1) out.push(`${pcts[0]}% de Adiantamento`);
    out.push(`Valor Total do Adiantamento ${fmtBRL(totalAdt)}`);
  }
  out.push(info?.codigo ? `Código ${info.codigo} – ${info.nome}` : nomeFallback);
  if (info?.pix_chave) out.push(`Pix: ${info.pix_chave}`);
  return out;
}

/**
 * Texto padrão (WhatsApp) de adiantamento/quitação:
 *   1. OC 132371 (30.000,00 KG) CTE 1423/1424/1425 VLR R$ 6.300,00
 * Um bloco por transportadora quando houver mais de uma.
 */
export function gerarTextoComprovante(params: {
  adiantamentos: Adiantamento[];
  modo: ModoComprovante;
  transportadoras: TransportadoraFinanceiro[];
}): string {
  const { modo, transportadoras } = params;
  const ativos = params.adiantamentos.filter((a) => a.status !== "cancelado");
  if (ativos.length === 0) return "";

  const titulo =
    modo === "quitacao"
      ? "QUITAÇÃO DO FRETE CIF, FORA DO ESTADO."
      : "ADIANTAMENTO DO FRETE CIF, FORA DO ESTADO.";

  // Blocos por transportadora, preservando ordem de aparição.
  const blocos = new Map<string, { id: string | null; nome: string; itens: Adiantamento[] }>();
  for (const a of ativos) {
    const k = a.transportadora_id ?? `nome:${a.transportadora}`;
    const b = blocos.get(k) ?? { id: a.transportadora_id ?? null, nome: a.transportadora, itens: [] };
    b.itens.push(a);
    blocos.set(k, b);
  }

  const linhas: string[] = [titulo, ""];
  const multi = blocos.size > 1;
  let n = 0;
  for (const b of blocos.values()) {
    const info = resolveTranspInfo(transportadoras, b.id, b.nome);
    const grupos = gruposParaComprovante(b.itens);
    if (multi) linhas.push(b.nome.toUpperCase());
    linhas.push(...linhasDoBloco(grupos, modo, multi ? 0 : n));
    n += grupos.length;
    linhas.push("");
    linhas.push(...rodape(b.itens, modo, info, b.nome));
    if (multi) linhas.push("");
  }
  while (linhas.length && linhas[linhas.length - 1] === "") linhas.pop();
  return linhas.join("\n");
}
