

# Corrigir: Veículo Esperado Não Sai da Lista Após Registro

## Problema

Em `Portaria.tsx` linha 121, ao marcar como conferido, o código usa `dateFromStr` (data do filtro) em vez de `match.data_referencia` (data real do veículo). Como a query de UPDATE filtra por `data_referencia` E `placa`, se as datas não coincidem, nenhuma linha é atualizada — o veículo permanece na lista.

## Solução

**`src/pages/Portaria.tsx`** (linha 121): Trocar `dateFromStr` por `match.data_referencia`.

```typescript
// De:
marcarConferidoMutation.mutate({ placa: match.placa, dataReferencia: dateFromStr });

// Para:
marcarConferidoMutation.mutate({ placa: match.placa, dataReferencia: match.data_referencia });
```

| Arquivo | Mudança |
|---|---|
| `src/pages/Portaria.tsx` | Usar `match.data_referencia` em vez de `dateFromStr` no `marcarConferido` |

