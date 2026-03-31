

# Corrigir Badge de Data Prevista no Dialog de Detalhes

## Problema

O badge de data prevista não aparece no `MovimentoDetailsDialog` porque a busca na tabela `veiculos_esperados` provavelmente não encontra correspondência. Dois possíveis motivos:

1. **Case sensitivity**: A placa na `veiculos_esperados` vem direto da planilha (pode ter casing diferente), mas a busca usa `.toUpperCase()`.
2. **Sem `as any`**: Embora a tabela esteja nos types, pode haver incompatibilidade de tipagem causando falha silenciosa.

## Solução

### `src/components/portaria/MovimentoDetailsDialog.tsx`

1. Usar `.ilike("placa", placaBusca)` em vez de `.eq("placa", placaBusca)` para ignorar case
2. Adicionar filtro de data razoável (últimos 7 dias) para pegar o registro mais relevante
3. Adicionar tratamento de erro no `queryFn` para não falhar silenciosamente

### `src/hooks/useVeiculosEsperados.ts` (importação)

4. Normalizar placa para uppercase no momento da importação (`r.placa.toUpperCase().trim()`) para consistência futura

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/MovimentoDetailsDialog.tsx` | Usar `ilike` para busca case-insensitive da placa + log de erro |
| `src/hooks/useVeiculosEsperados.ts` | Normalizar placa para uppercase na importação |

