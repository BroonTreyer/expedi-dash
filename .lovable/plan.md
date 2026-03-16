

# Alterar KPI "Total Cargas" para contar pedidos únicos

## Alteração

No `KpiCards.tsx`, mudar o cálculo de `totalCargas` de `data.length` para contar valores únicos de `numero_pedido`:

```typescript
// De:
const totalCargas = data.length;

// Para:
const totalCargas = new Set(data.filter(c => c.numero_pedido).map(c => c.numero_pedido)).size;
```

Também renomear o label de "Total Cargas" para "Total Pedidos" para refletir melhor o que está sendo contado.

