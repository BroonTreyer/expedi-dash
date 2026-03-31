

# Corrigir "Limpar Lista" na Portaria

## Problema

O botão "Limpar lista" chama `limparMutation.mutate(dateFromStr)` que deleta apenas os veículos da data selecionada (ex: `2026-03-31`). Porém, o painel exibe veículos de uma janela de ±3 dias. Se os veículos visíveis são de datas como `2026-03-28` ou `2026-03-30`, o DELETE não os afeta — a lista parece não limpar.

## Solução

**`src/hooks/useVeiculosEsperados.ts`** — Alterar `useLimparVeiculosEsperados` para aceitar um array de datas (ou um range) e deletar todas as datas visíveis, não apenas uma.

**`src/pages/Portaria.tsx`** — Passar todas as datas únicas dos `veiculosEsperados` visíveis ao mutation, ou passar o range `dataInicio`/`dataLimite` para deletar tudo na janela.

Abordagem concreta:
1. Mudar `useLimparVeiculosEsperados` para aceitar `{ dataInicio: string, dataFim: string }` e usar `.gte("data_referencia", dataInicio).lte("data_referencia", dataFim)` no DELETE
2. Em `Portaria.tsx`, calcular o range ±3 dias e passar ao mutation

| Arquivo | Mudança |
|---|---|
| `src/hooks/useVeiculosEsperados.ts` | `useLimparVeiculosEsperados` aceita range de datas e deleta com `.gte/.lte` |
| `src/pages/Portaria.tsx` | Passar range de datas ao invés de data única |

