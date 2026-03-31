
# Auditoria Completa do Sistema — 4 Partes

---

## PARTE 1: Segurança e Controle de Acesso

### BUG 1.1 — Fallback de role "logistica" concede acesso amplo (ALTO RISCO)
**Arquivo:** `src/hooks/useAuth.ts` linha 36
Quando o fetch de role falha ou dá timeout, o fallback é `"logistica"`. Isso significa que um usuário com role `"portaria"` ou `"faturamento"`, se houver instabilidade de rede, recebe temporariamente acesso de `logistica` — podendo fechar cargas, roteirizar, registrar movimentos.

**Correção:** Mudar fallback para `null` e tratar `role === null` como estado de carregamento (sem acesso até resolver).

### BUG 1.2 — Auth redirect para portaria envia para `/` quando acesso negado
**Arquivo:** `src/pages/Auth.tsx` linha 27
Quando o usuário `portaria` faz login, o `Auth.tsx` redireciona para `/` (`<Navigate to="/" replace />`), mas `/` agora bloqueia portaria. O `ProtectedRoute` resolve isso redirecionando para `/portaria`, mas causa um flash/redirect duplo desnecessário.

**Correção:** Em `Auth.tsx`, redirecionar baseado no role do usuário em vez de sempre para `/`.

### BUG 1.3 — `useDeleteMovimentacao` silencia erro de permissão no delete de vinculados
**Arquivo:** `src/hooks/useMovimentacoesPortaria.ts` linhas 116-121
O delete de registros vinculados (retornos) não verifica erro. Se o RLS bloquear, falha silenciosamente mas continua tentando deletar o registro principal.

**Correção:** Checar o erro do primeiro delete antes de prosseguir.

### BUG 1.4 — `create-user` edge function usa `getClaims` (método não disponível)
**Arquivo:** `supabase/functions/create-user/index.ts` linha 31
`auth.getClaims(token)` não é uma API pública do Supabase JS SDK. Se funciona, é por acaso. Deveria usar `auth.getUser(token)` para verificar o caller.

**Correção:** Substituir `getClaims` por `getUser`.

### BUG 1.5 — Sem validação de role válida na criação de usuário
**Arquivo:** `supabase/functions/create-user/index.ts` linha 54
O `role` enviado pelo frontend não é validado contra os valores permitidos do enum `app_role`. Um admin poderia enviar um valor inválido.

**Correção:** Validar que `role` está em `["admin", "logistica", "faturamento", "portaria"]`.

---

## PARTE 2: Lógica de Dados e Queries

### BUG 2.1 — `useMarcarConferido` invalida queryKey errada
**Arquivo:** `src/hooks/useVeiculosEsperados.ts` linha 156
A invalidação usa `["veiculos_esperados", vars.dataReferencia]`, mas a queryKey real é `["veiculos_esperados", dataInicio, dataLimite]` (janela de +-3 dias). Como nunca faz match, o cache não é atualizado após marcar conferido.

**Correção:** Invalidar com `{ queryKey: ["veiculos_esperados"] }` (sem parâmetros específicos).

### BUG 2.2 — `useLimparVeiculosEsperados` invalida queryKey errada
**Arquivo:** `src/hooks/useVeiculosEsperados.ts` linha 173
Mesmo problema do bug 2.1 — invalida `["veiculos_esperados", dataReferencia]` mas a key real é diferente.

**Correção:** Invalidar com `{ queryKey: ["veiculos_esperados"] }`.

### BUG 2.3 — Consolidado não tem realtime
**Arquivo:** `src/pages/Consolidado.tsx`
A página Consolidado usa `useConsolidado` (query customizada sem canal realtime). Se um operador muda status no Painel, o Consolidado só atualiza no próximo refetch.

**Correção (menor):** Adicionar canal realtime ou reduzir `staleTime`.

### BUG 2.4 — `useCarregamentos` query para "hoje" traz pendentes antigos mas sem limite
**Arquivo:** `src/hooks/useCarregamentos.ts` linha 124
A query `data.lt.${dateFrom},status.neq.Carregado` traz TODOS os pedidos pendentes de TODAS as datas anteriores, sem limite. Com o tempo, pode trazer centenas de registros desnecessários.

**Correção:** Adicionar um limite de janela (ex: últimos 30 dias).

### BUG 2.5 — Movimentações query usa `lt` em vez de `lte` para dateEnd
**Arquivo:** `src/hooks/useMovimentacoesPortaria.ts` linha 85
`.lt("data_hora", \`${dateEnd}T23:59:59.999\`)` — funciona mas perde registros exatamente às 23:59:59.999+. Deveria usar `< ${dateEnd+1}T00:00:00` ou `lte` com o timestamp correto.

**Correção (menor):** Usar `.lt("data_hora", \`${nextDay}T00:00:00\`)`.

### BUG 2.6 — Veículos esperados usam `as any` para contornar tipagem
**Arquivo:** `src/hooks/useVeiculosEsperados.ts` linhas 44, 118, 123, 145, 167
Todos os acessos à tabela `veiculos_esperados` usam `as any`, indicando que a tabela não está nos types gerados. Isso desabilita type-checking completamente.

**Correção:** Regenerar os types do Supabase para incluir a tabela.

---

## PARTE 3: UI, UX e Bugs Visuais

### BUG 3.1 — Warning: Badge não aceita ref (console error)
**Arquivo:** `src/pages/Portaria.tsx` + `src/components/ui/badge.tsx`
O console mostra: "Function components cannot be given refs" para o Badge dentro de TabsTrigger. O TabsTrigger do Radix tenta passar ref para o Badge.

**Correção:** Não usar Badge como child direto de TabsTrigger, ou adicionar `forwardRef` ao Badge.

### BUG 3.2 — `saidaRapidaId` persiste entre renders no PatioAtualTab
**Arquivo:** `src/components/portaria/PatioAtualTab.tsx` linha 65
Se o usuário clica "Retorno" em um veículo, navega para outra aba e volta, o `saidaRapidaId` permanece no estado, mostrando o diálogo de confirmação para um veículo que pode não estar mais na lista.

**Correção (menor):** Resetar `saidaRapidaId` quando movimentações mudam.

### BUG 3.3 — Kanban view sem controle de permissão
**Arquivo:** `src/components/dashboard/KanbanView.tsx`
A KanbanView permite drag-and-drop para mudar status, mas não verifica `userRole`. Um faturamento pode arrastar cards no Kanban.

**Correção:** Passar `userRole` para KanbanView e desabilitar drag para roles sem permissão.

### BUG 3.4 — Filtro de categoria com valor `""` em vez de `"all"`
**Arquivo:** `src/pages/Portaria.tsx` linha 38
`categoriaFilter` inicia como `""`, mas o Select usa `"all"` como valor para "Todas". Quando o usuário abre a página, nenhuma opção está selecionada no Select (placeholder "Categoria" aparece). Se selecionar "Todas" e depois tentar voltar, funciona. Inconsistência visual menor.

**Correção:** Iniciar como `"all"`.

### BUG 3.5 — Cards mobile no Pátio não mostram data quando é multi-dia
**Arquivo:** `src/components/portaria/PatioAtualTab.tsx`
Se o filtro é multi-dia, os cards mobile mostram apenas "HH:mm", sem data. O usuário não sabe de qual dia é cada veículo.

**Correção:** Detectar `isMultiDay` e usar formato com data.

---

## PARTE 4: Performance, Manutenção e Edge Cases

### BUG 4.1 — Realtime channel nunca recria ao mudar datas
**Arquivo:** `src/hooks/useCarregamentos.ts` linhas 47-104
O canal realtime é criado uma vez (dependency: `[queryClient]`) e escuta TODAS as mudanças na tabela, não filtrado por data. Quando o usuário muda a data, o canal invalida queries que podem não existir mais.

**Correção (menor):** O comportamento atual funciona (invalida todas as queries de carregamentos), mas é ineficiente.

### BUG 4.2 — `FechamentoLoteDialog` envia updates em loop sem batch
**Arquivo:** `src/pages/Index.tsx` linha 217 (handleLoteSubmit)
O `handleLoteSubmit` chama `updateMut.mutate()` em loop para cada item individual. Se houver 30 pedidos, dispara 30 mutations em paralelo, causando race conditions na UI e potencial throttle do Supabase.

**Correção:** Usar uma única chamada batch (`.in("id", ids)` com `.update()`).

### BUG 4.3 — `handleSubmit` no CarregamentoDialog não espera todas as mutations
**Arquivo:** `src/components/dashboard/CarregamentoDialog.tsx` linhas 153-178
Ao editar com múltiplos items, o `onSubmit` é chamado em loop síncrono. O dialog fecha com `setTimeout 150ms`, mas as mutations podem não ter completado. Isso pode causar inconsistência se o usuário abrir outro dialog imediatamente.

**Correção:** Usar `Promise.all` com `mutateAsync` e fechar no `onSettled`.

### BUG 4.4 — `Consolidado` não recebe `handleStatusChange` correta
**Arquivo:** `src/pages/Consolidado.tsx` linhas 132-146
O `updateStatusMut` usa `.in("id", ids)` que atualiza vários registros de uma vez, mas não retorna `.select()`. Portanto, o realtime pode não captar todas as mudanças em tempo.

**Correção (menor):** Invalidar queries é suficiente, mas `onMutate` com optimistic update seria ideal.

### BUG 4.5 — Memory leak: `now` timer no PatioAtualTab roda mesmo quando aba não está visível
**Arquivo:** `src/components/portaria/PatioAtualTab.tsx` linha 69-72
O `setInterval` de 60s para atualizar `now` continua rodando mesmo quando o componente não está na aba ativa (Histórico ou Esperados). Como o componente está dentro de `TabsContent`, ele pode continuar montado.

**Correção (menor):** Usar `document.visibilityState` para pausar.

### BUG 4.6 — Sem paginação na tabela de Expedição (Index)
**Arquivo:** `src/pages/Index.tsx`
A `CarregamentoTable` renderiza TODOS os carregamentos filtrados sem paginação. Com centenas de pedidos por dia, o DOM fica pesado.

**Correção (menor):** Adicionar paginação ou virtualização.

### BUG 4.7 — `useRealtimeStatus` assume connected se canal existente
**Arquivo:** `src/hooks/useRealtimeStatus.ts` linhas 16-21
Se o canal `carregamentos-realtime` existe, assume `"connected"` sem verificar o estado real. O canal pode estar em `CHANNEL_ERROR`.

**Correção:** Verificar `existing.state` em vez de assumir connected.

---

## Resumo Priorizado

| Prioridade | Bug | Impacto |
|---|---|---|
| CRITICO | 1.1 Fallback "logistica" | Escalação de privilégios temporária |
| CRITICO | 2.1/2.2 QueryKey errada nos veículos esperados | Cache não atualiza (conferir/limpar parece não funcionar) |
| ALTO | 1.2 Auth redirect duplo | Flash visual, UX ruim |
| ALTO | 1.4 getClaims inexistente | Edge function pode quebrar |
| ALTO | 3.1 Badge ref warning | Erro no console, possíveis crashes |
| MEDIO | 4.2 Mutations em loop | Performance, race conditions |
| MEDIO | 2.4 Query sem limite | Performance degradada com o tempo |
| MEDIO | 2.6 Types "as any" | Sem type-safety |
| BAIXO | 3.4, 3.5, 4.5, 4.7 | UX/Performance menores |

## Arquivos Afetados

| Arquivo | Bugs |
|---|---|
| `src/hooks/useAuth.ts` | 1.1 |
| `src/pages/Auth.tsx` | 1.2 |
| `src/hooks/useMovimentacoesPortaria.ts` | 1.3, 2.5 |
| `supabase/functions/create-user/index.ts` | 1.4, 1.5 |
| `src/hooks/useVeiculosEsperados.ts` | 2.1, 2.2, 2.6 |
| `src/hooks/useCarregamentos.ts` | 2.4, 4.1 |
| `src/pages/Portaria.tsx` | 3.1, 3.4 |
| `src/components/ui/badge.tsx` | 3.1 |
| `src/components/portaria/PatioAtualTab.tsx` | 3.2, 3.5, 4.5 |
| `src/components/dashboard/KanbanView.tsx` | 3.3 |
| `src/pages/Index.tsx` | 4.2, 4.6 |
| `src/components/dashboard/CarregamentoDialog.tsx` | 4.3 |
| `src/pages/Consolidado.tsx` | 2.3, 4.4 |
| `src/hooks/useRealtimeStatus.ts` | 4.7 |
