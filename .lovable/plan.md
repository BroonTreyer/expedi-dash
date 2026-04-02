

# Adicionar peso (kg) ao ranking de produtos com ruptura no Analytics

## Problema
O ranking de "Produtos com Mais Rupturas" na aba Rupturas do Analytics mostra apenas a **quantidade** de rupturas por produto, mas não mostra o **peso total em kg** de cada produto.

## Solução

### 1. `src/hooks/useAnalytics.ts` — Acumular peso no mapa de rupturas por produto

A interface `ProdutoRuptura` já tem o campo `peso` mas não está sendo preenchido. Alterar o bloco de cálculo (linhas 265-274):

- Trocar o Map de `Map<string, number>` para `Map<string, { count: number; peso: number }>`
- Acumular `r.peso` junto com a contagem
- Mapear para `{ produto, rupturas, peso }` no resultado final

### 2. `src/pages/Analytics.tsx` — Mostrar peso no gráfico/tooltip

No gráfico de barras horizontais (linhas 760-775):
- Adicionar uma segunda barra (`peso`) ou exibir o peso no tooltip
- Atualizar o tooltip para mostrar "X rupturas — Y kg" por produto

Abordagem recomendada: manter o gráfico com barras de contagem, mas adicionar o peso no tooltip para não poluir visualmente.

| Arquivo | Mudança |
|---|---|
| `useAnalytics.ts` | Acumular peso no `prodRuptMap` e incluir no resultado |
| `Analytics.tsx` | Exibir peso no tooltip do gráfico de rupturas por produto |

