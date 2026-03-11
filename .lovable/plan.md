

# Auditoria de Performance e Otimização do Sistema

## Problemas Identificados

### 1. Troca de status lenta (problema principal)
Quando o usuario muda o status, o fluxo atual e:
1. Envia PATCH ao servidor
2. Espera resposta
3. Invalida cache (marca como stale)
4. Refaz GET completo
5. Renderiza

Isso causa ~500-1000ms de delay visivel. Nao ha **optimistic update** -- a UI so atualiza apos o servidor confirmar e refazer o fetch.

### 2. Realtime causa refetch completo
Quando o realtime recebe qualquer evento, invalida toda a query e refaz o GET. Deveria aplicar o patch diretamente no cache.

### 3. Canal realtime duplicado
`useRealtimeStatus` cria um canal separado so para checar status. Dois canais ouvindo a mesma tabela.

### 4. Dados estaticos sem cache adequado
`vendedores`, `produtos`, `tiposCaminhao` nao tem `staleTime` -- refetcham desnecessariamente. Sao dados que mudam raramente.

### 5. Sem memoizacao no filtro e KPIs
`filtered` e recalculado a cada render. `KpiCards` recalcula metricas a cada render mesmo sem mudanca nos dados.

### 6. QueryClient sem defaults globais
Nenhuma configuracao global de `staleTime` ou `gcTime`.

---

## Plano de Correcao

### `useCarregamentos.ts` - Optimistic updates + realtime inteligente
- Adicionar `onMutate` com optimistic update no `useUpdateCarregamento`: atualizar o cache local imediatamente antes do servidor responder
- No callback realtime, ao inves de `invalidateQueries`, aplicar patch diretamente no cache com `setQueryData` (para updates) ou invalidar apenas para insert/delete
- Remover `refetchInterval: 30000` (redundante com realtime)
- Aumentar `staleTime` para 30s (realtime mantem atualizado)

### `useVendedores.ts`, `useProdutos.ts`, `useTiposCaminhao.ts` - Cache longo
- Adicionar `staleTime: 5 * 60 * 1000` (5 min) -- dados que mudam raramente

### `App.tsx` - QueryClient com defaults
- Configurar `defaultOptions` com `staleTime` e `gcTime` globais

### `useRealtimeStatus.ts` - Eliminar canal duplicado
- Refatorar para usar o mesmo canal do `useCarregamentos`, ou simplificar para verificar conexao sem criar canal separado

### `Index.tsx` - Memoizacao
- Usar `useMemo` para `filtered`
- Usar `useCallback` para handlers

### `KpiCards.tsx` - React.memo
- Envolver com `React.memo` para evitar re-renders desnecessarios

## Detalhes Tecnicos

A otimizacao mais impactante e o **optimistic update** no `useUpdateCarregamento`:

```text
ANTES:  Click → PATCH → Wait → Invalidate → GET → Render (~800ms)
DEPOIS: Click → Render imediato → PATCH em background → Confirma/Rollback
```

## Arquivos (6)
1. `src/hooks/useCarregamentos.ts` - Optimistic updates + realtime inteligente
2. `src/hooks/useVendedores.ts` - staleTime
3. `src/hooks/useProdutos.ts` - staleTime
4. `src/hooks/useTiposCaminhao.ts` - staleTime
5. `src/App.tsx` - QueryClient defaults
6. `src/pages/Index.tsx` - useMemo/useCallback

