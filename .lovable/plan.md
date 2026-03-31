

# Corrigir KPI "No Pátio" e Unificar Lógicas de Contagem

## Problema

Existem **3 locais** com lógica de contagem de veículos no pátio, e estão divergentes:

1. **`PortariaKpiCards.tsx`** — Para terceirizados, conta apenas `etapa === "no_patio"` **sem verificar se já tem saída vinculada**. Isso faz o KPI mostrar "1" mesmo quando o veículo já saiu.
2. **`Portaria.tsx` counts** (badge das tabs) — Recém corrigido, usa lógica correta.
3. **`PatioAtualTab.tsx`** — Filtra corretamente (sem saída vinculada + não finalizado).

O resultado: o KPI mostra "No Pátio: 1" mas a lista está vazia.

## Solução

Alinhar a lógica do `PortariaKpiCards.tsx` com as demais — primeiro excluir entradas que já têm saída vinculada, depois excluir terceirizados finalizados.

### Mudança em `src/components/portaria/PortariaKpiCards.tsx`

Substituir o cálculo de `noPatio` (linhas 26-31):

```typescript
// Antes (bugado):
const noPatio = entradas.filter((e) => {
  if (e.categoria === "terceirizado") {
    return e.etapa_terceirizado === "no_patio";
  }
  return !saidasVinculadas.has(e.id);
}).length;

// Depois (unificado com PatioAtualTab):
const noPatio = entradas.filter((e) => {
  if (saidasVinculadas.has(e.id)) return false;
  if (e.categoria === "terceirizado" && e.etapa_terceirizado === "finalizado") return false;
  return true;
}).length;
```

A mesma lógica do `PatioAtualTab` e do badge em `Portaria.tsx` — garantindo que os 3 locais estejam sincronizados.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/PortariaKpiCards.tsx` | Alinhar lógica de `noPatio` com PatioAtualTab (verificar saída vinculada antes de contar) |

