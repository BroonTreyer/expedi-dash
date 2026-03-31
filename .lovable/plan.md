

# Corrigir Contagem do Histórico — Agrupar Entrada+Saída como 1

## Problema

O badge "Histórico 2" conta cada registro individualmente (`movimentacoes.length`). Uma entrada + saída vinculada = 2 registros, mas visualmente aparecem agrupados como 1 movimento no `HistoricoTab`.

## Solução

Calcular a contagem de grupos em vez de registros brutos, usando a mesma lógica de agrupamento do `HistoricoTab`: saídas vinculadas a uma entrada são agrupadas juntas.

### Mudança em `src/pages/Portaria.tsx` (linha 78)

Contar movimentos agrupados: total de registros **menos** o número de saídas vinculadas (cada saída vinculada já é contada junto com sua entrada).

```typescript
// Antes:
return { patio, historico: movimentacoes.length };

// Depois:
const historico = movimentacoes.length - saidasVinculadas.size;
return { patio, historico };
```

| Arquivo | Mudança |
|---|---|
| `src/pages/Portaria.tsx` | Subtrair saídas vinculadas da contagem do histórico |

