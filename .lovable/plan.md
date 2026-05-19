## Objetivo
Esconder colunas de data irrelevantes em cada aba de adiantamentos.

## Mudanças

**`src/components/logistica/AdiantamentosTab.tsx`**

1. `ListaAdiantamentos`: nova prop opcional `contexto?: "pendente" | "aguardando" | "quitado"`.
2. Derivar `showPagoEm` (contexto !== "pendente") e `showQuitadoEm` (contexto === "quitado"). Quando `contexto` é undefined, mostra ambas (compatível com chamadas atuais sem prop).
3. Adicionar coluna **"Pago em"** (`fmtDate(a.pago_em)`) entre Saldo e Quitado em, controlada por `showPagoEm`.
4. Coluna **"Quitado em"** existente controlada por `showQuitadoEm`.
5. Passar `contexto="pendente"` na lista de Pendentes (~599), `contexto="aguardando"` na lista de Aguardando Quitação, `contexto="quitado"` na lista de Quitados (~693).

**`src/hooks/useAdiantamentos.ts`**
- Adicionar `pago_em: string | null` no tipo `Adiantamento` (já vem no SELECT *, só tipar).