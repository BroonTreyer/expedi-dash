/** Verdadeiro quando o item tem ruptura total OU parcial (sinalizada pelo trigger). */
export const temRuptura = (c: { ruptura?: boolean | null; ruptura_sinalizada?: boolean | null }) =>
  !!(c?.ruptura || c?.ruptura_sinalizada);