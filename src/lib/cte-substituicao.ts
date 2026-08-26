// Detecção de CT-e substituído (desdobrado).
//
// Caso real (OC 132296): o CT-e 1339 de R$ 13.440,00 foi cancelado pela
// transportadora e reemitido como 1343 (R$ 6.000,00) + 1344 (R$ 7.440,00).
// Como o 1339 continuou lançado, a mesma carga gerou adiantamento duas vezes
// e a quitação somou R$ 10.176,00 em vez de R$ 7.488,00.
//
// Regra: dentro da MESMA Ordem de Carga + transportadora, se o valor de um
// CT-e fecha exatamente a soma de dois ou três outros CT-es, é indício forte
// de substituição.

export const TOLERANCIA_REAIS = 0.02;

export type CteValor = {
  id: string;
  numero: string;
  valor: number;
};

export type Substituicao = {
  /** CT-e que provavelmente foi substituído (valor "cheio"). */
  alvo: CteValor;
  /** CT-es que somados fecham o valor do alvo. */
  partes: CteValor[];
  soma: number;
};

function combinacoes<T>(arr: T[], tamanho: number): T[][] {
  const out: T[][] = [];
  const walk = (inicio: number, atual: T[]) => {
    if (atual.length === tamanho) {
      out.push([...atual]);
      return;
    }
    for (let i = inicio; i < arr.length; i++) {
      atual.push(arr[i]);
      walk(i + 1, atual);
      atual.pop();
    }
  };
  walk(0, []);
  return out;
}

/**
 * Procura CT-es de `alvos` cujo valor seja igual à soma de 2 ou 3 CT-es de
 * `partesDisponiveis` (tolerância de centavos). Ignora valores <= 0.
 */
export function detectarSubstituicoes(
  alvos: CteValor[],
  partesDisponiveis: CteValor[],
  maxPartes = 3,
): Substituicao[] {
  const partes = partesDisponiveis.filter((p) => Number(p.valor) > 0);
  const res: Substituicao[] = [];
  for (const alvo of alvos) {
    const valorAlvo = Number(alvo.valor) || 0;
    if (valorAlvo <= 0) continue;
    const candidatas = partes.filter((p) => p.id !== alvo.id);
    let achou: Substituicao | null = null;
    for (let n = 2; n <= Math.min(maxPartes, candidatas.length) && !achou; n++) {
      for (const combo of combinacoes(candidatas, n)) {
        const soma = combo.reduce((s, c) => s + Number(c.valor || 0), 0);
        if (Math.abs(soma - valorAlvo) <= TOLERANCIA_REAIS) {
          achou = { alvo, partes: combo, soma };
          break;
        }
      }
    }
    if (achou) res.push(achou);
  }
  return res;
}
