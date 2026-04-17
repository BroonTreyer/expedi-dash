// Faixas oficiais de CEP por UF (Correios)
// Cada faixa: [inícioCEP, fimCEP] como números de 8 dígitos.
const FAIXAS: Array<[number, number, string]> = [
  [1000000, 19999999, "SP"],
  [20000000, 28999999, "RJ"],
  [29000000, 29999999, "ES"],
  [30000000, 39999999, "MG"],
  [40000000, 48999999, "BA"],
  [49000000, 49999999, "SE"],
  [50000000, 56999999, "PE"],
  [57000000, 57999999, "AL"],
  [58000000, 58999999, "PB"],
  [59000000, 59999999, "RN"],
  [60000000, 63999999, "CE"],
  [64000000, 64999999, "PI"],
  [65000000, 65999999, "MA"],
  [66000000, 68899999, "PA"],
  [68900000, 68999999, "AP"],
  [69000000, 69299999, "AM"],
  [69300000, 69399999, "RR"],
  [69400000, 69899999, "AM"],
  [69900000, 69999999, "AC"],
  [70000000, 72799999, "DF"],
  [72800000, 72999999, "GO"],
  [73000000, 73699999, "DF"],
  [73700000, 76799999, "GO"],
  [76800000, 76999999, "RO"],
  [77000000, 77999999, "TO"],
  [78000000, 78899999, "MT"],
  [78900000, 78999999, "RO"],
  [79000000, 79999999, "MS"],
  [80000000, 87999999, "PR"],
  [88000000, 89999999, "SC"],
  [90000000, 99999999, "RS"],
];

/** Normaliza CEP: só dígitos, max 8. Retorna "" se inválido (<8). */
export function normalizeCep(value: string | null | undefined): string {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "").slice(0, 8);
  return digits.length === 8 ? digits : "";
}

/** Aplica máscara visual 00000-000 em um CEP parcial ou completo. */
export function maskCep(value: string): string {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** Retorna a UF (2 letras) inferida do CEP, ou "" se não encontrar. */
export function ufFromCep(cep: string | null | undefined): string {
  const norm = normalizeCep(cep);
  if (!norm) return "";
  const n = parseInt(norm, 10);
  if (isNaN(n)) return "";
  for (const [ini, fim, uf] of FAIXAS) {
    if (n >= ini && n <= fim) return uf;
  }
  return "";
}
