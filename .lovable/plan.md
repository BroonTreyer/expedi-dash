## Problema
Ao subir vários DACTEs ao mesmo tempo, todos batem no Lovable AI Gateway em paralelo e recebem **HTTP 429** (`rate_limited`). A edge function `parse-dacte-pdf` propaga o 429 cru, e o frontend mostra apenas "Edge Function returned a non-2xx status code".

## Plano

### 1. `supabase/functions/parse-dacte-pdf/index.ts` — Retry com backoff
- Encapsular a chamada `fetch("https://ai.gateway.lovable.dev/...")` em uma função `callGatewayWithRetry()`:
  - Até **3 tentativas**.
  - Esperas: **1s → 3s → 7s** + jitter aleatório de 0–500ms.
  - Só faz retry em `429` e `5xx`. Outros erros (400/401/402) abortam imediatamente.
- Mapear o resultado final:
  - `429` persistente → resposta `429` com `{ error: "rate_limited", message: "Limite temporário da IA, tente novamente em alguns segundos.", retryable: true }`.
  - `402` → `{ error: "payment_required", message: "Créditos da IA esgotados.", retryable: false }`.
  - Sucesso → comportamento atual.
- Mantém CORS e a estrutura de tool calling existente.

### 2. `src/components/logistica/ImportarDacteDialog.tsx` — Concorrência limitada + retry manual
- No `handleFiles`, substituir o `Promise.all` por uma **fila com concorrência 2** (helper `runWithConcurrency(items, 2, worker)` definido inline).
- Tratar a resposta da edge function:
  - Se `error?.message` contém `"rate_limited"` ou status 429 → `status: "rate_limited"`, `error: "Limite temporário da IA — clique em Tentar novamente"`.
  - Outros erros → `status: "error"` (igual hoje).
- Adicionar `rate_limited` ao tipo `Item.status`.
- No render do item com `status === "rate_limited"`:
  - Badge âmbar "Limite da IA atingido".
  - Botão **"Tentar novamente"** que dispara `retryItem(it)` — reusa o mesmo fluxo de parse para aquele único arquivo.
- Adicionar botão global **"Tentar novamente todos com erro de limite"** acima da lista quando houver ≥1 item `rate_limited`.

## Fora de escopo
- Não muda RLS, schema, nem a UI do botão "Ver PDF" já entregue.
- Sem rate-limiting próprio no backend (apenas backoff em cima do gateway).
