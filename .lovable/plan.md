

# Corrigir Divergência entre Contagem e Lista do Pátio

## Problema

O badge "Pátio 1" mostra 1 veículo, mas a lista está vazia. Isso acontece porque a **contagem** (em `Portaria.tsx`) e a **lista** (em `PatioAtualTab.tsx`) usam lógicas diferentes para determinar quais veículos estão no pátio:

- **Contagem**: para terceirizados, verifica apenas `etapa_terceirizado` (aguardando/no_patio), ignorando se já tem saída vinculada
- **Lista**: para TODOS os veículos (incluindo terceirizados), exige que NÃO tenha saída vinculada — e depois exclui finalizados

Resultado: um terceirizado com `etapa === "aguardando"` que já tem uma saída vinculada aparece na contagem mas não na lista.

## Solução

Unificar a lógica. Extrair a função de filtro para um utilitário compartilhado, ou simplesmente alinhar o cálculo do count em `Portaria.tsx` para usar a mesma lógica do `PatioAtualTab.tsx`.

### Mudança em `src/pages/Portaria.tsx`

Alterar o cálculo de `counts.patio` para usar a mesma lógica do tab:
1. Filtrar entradas sem saída vinculada (`!saidasVinculadas.has(m.id)`)
2. Excluir terceirizados com `etapa_terceirizado === "finalizado"`

```ts
// Antes (lógica divergente):
const patio = movimentacoes.filter((m) => {
  if (m.tipo_movimento !== "entrada") return false;
  if (m.categoria === "terceirizado") {
    return m.etapa_terceirizado === "aguardando" || m.etapa_terceirizado === "no_patio";
  }
  return !saidasVinculadas.has(m.id);
}).length;

// Depois (alinhado com PatioAtualTab):
const patio = movimentacoes.filter((m) => {
  if (m.tipo_movimento !== "entrada") return false;
  if (saidasVinculadas.has(m.id)) return false;
  if (m.categoria === "terceirizado" && m.etapa_terceirizado === "finalizado") return false;
  return true;
}).length;
```

| Arquivo | Mudança |
|---|---|
| `src/pages/Portaria.tsx` | Alinhar lógica de contagem do pátio com a lógica de exibição do `PatioAtualTab` |

