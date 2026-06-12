import type { TransportadoraFin } from "@/hooks/useTransportadorasFinanceiro";

/**
 * Normaliza o nome de uma transportadora para comparação tolerante:
 * - upper-case + trim
 * - remove acentos
 * - remove pontuação
 * - remove sufixos societários comuns (LTDA, LTD, ITDA, S/A, SA, EIRELI, ME, EPP, CIA)
 * - colapsa espaços
 *
 * Útil porque o nome que vem do DACTE costuma divergir do cadastro
 * (ex.: "guava transportes Itda" vs "GUAVA LOGISTICA E TRANSPORTES LTDA").
 */
export function normalizaNomeTransp(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = String(raw)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ");
  // remove sufixos societários como palavras isoladas
  s = s.replace(/\b(LTDA|LTD|ITDA|EIRELI|S\s*A|SA|ME|EPP|CIA|MEI)\b/g, " ");
  // remove tokens muito curtos que viram ruído após sufixos (e/de/do/da)
  s = s.replace(/\b(E|DE|DO|DA|DAS|DOS)\b/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/** Procura uma transportadora cadastrada por nome (com normalização tolerante). */
export function acharTranspPorNome<T extends Pick<TransportadoraFin, "nome">>(
  lista: T[],
  nome: string | null | undefined,
): T | null {
  const alvo = normalizaNomeTransp(nome);
  if (!alvo) return null;
  // 1) match exato após normalização
  const exato = lista.find((t) => normalizaNomeTransp(t.nome) === alvo);
  if (exato) return exato;
  // 2) contém / contido (cobre "GUAVA" vs "GUAVA LOGISTICA TRANSPORTES")
  const parcial = lista.find((t) => {
    const n = normalizaNomeTransp(t.nome);
    return n.includes(alvo) || alvo.includes(n);
  });
  return parcial ?? null;
}

/**
 * Resolve a info da transportadora a partir de id (preferido) e cai para nome
 * normalizado quando o id não bate (ex.: adiantamentos antigos com id nulo).
 */
export function resolveTranspInfo<T extends Pick<TransportadoraFin, "id" | "nome">>(
  lista: T[],
  transportadora_id: string | null | undefined,
  nome: string | null | undefined,
): T | null {
  if (transportadora_id) {
    const porId = lista.find((t) => t.id === transportadora_id);
    if (porId) return porId;
  }
  return acharTranspPorNome(lista, nome);
}