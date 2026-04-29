## Problema

O usuário vê várias notificações **"Perfil de acesso não encontrado"** em sequência. Causa raiz combinada:

1. **Falha intermitente no fetch da role** (`useAuth.ts` → `fetchRoleWithRetry`). A query a `user_roles` está corrida contra um `Promise.race` com timeout de 5s. Quando a rede fica lenta, realtime está saturado ou há cold start, o timeout vence, a função retorna `null` mesmo o usuário tendo role válida no banco (verificado: `matheuscarneiro004@gmail.com → admin`, `matheuss-s@hotmail.com → vendedor`). Logs confirmam: `[Auth] Role fetch failed after retry` repetido.
2. **Toast disparado por componente, sem deduplicação global**. `ProtectedRoute` e `SuperAdminRoute` usam `useRef` local — quando o usuário troca de rota, navega entre páginas lazy, ou múltiplos guards montam, **cada um dispara seu próprio `toast.error`**, gerando a cascata.
3. **Redirect prematuro**: `missingRole` é considerado verdadeiro assim que `loading=false` e `role===null`, mesmo se o motivo foi um timeout transitório — disparando navegação + toast em cada montagem subsequente.

## Solução

### 1) Tornar o fetch da role mais resiliente (`src/hooks/useAuth.ts`)

- Aumentar `ROLE_TIMEOUT_MS` de 5s para 12s (rede lenta + RLS).
- Aumentar retries de 2 para 4 com backoff exponencial (1s, 2s, 4s).
- Distinguir **erro/timeout** de **role realmente ausente**:
  - Retornar um sentinel `{ role: AppRole | null, failed: boolean }`.
  - Se `failed=true`, **não setar `role=null` definitivamente** — manter `role` indefinido e tentar refetch ao focar a janela / reconectar.
- Adicionar listener `window` `online` e `visibilitychange` para refazer o fetch da role caso esteja faltando.

### 2) Deduplicar e silenciar o toast (`ProtectedRoute.tsx`, `SuperAdminRoute.tsx`)

- Usar **toast.error com `id` fixo** (`sonner` deduplica por id): `toast.error("...", { id: "auth-missing-role" })`. Garante uma única notificação visível em qualquer momento, independente de quantos guards montem.
- Adicionar um pequeno **grace period** (≈1.5s) antes de mostrar o toast/redirect quando `role===null`: renderiza o spinner de loading nesse intervalo e tenta um refetch. Evita flash de erro durante navegação.
- Quando o refetch durante o grace period retorna a role corretamente, nem toast nem redirect ocorrem.

### 3) Evitar redirect em loop

- Só executar o `Navigate` para `/auth` (no caso de `missingRole`) depois do grace period e de uma tentativa explícita de refetch falhar. Caso contrário, manter o usuário na rota atual com fallback de loading.

## Arquivos a editar

- `src/hooks/useAuth.ts` — fetch resiliente, refetch em `online`/`visibilitychange`, expor função `refreshRole`.
- `src/components/ProtectedRoute.tsx` — toast com id fixo, grace period com refetch, evitar redirect prematuro.
- `src/components/SuperAdminRoute.tsx` — mesmo tratamento.

## Resultado esperado

- Sem cascata de notificações mesmo se a role demorar para chegar.
- Usuário com role válida no banco nunca verá "Perfil de acesso não encontrado" por causa de timeout transitório.
- Caso a role realmente esteja ausente, **uma única** notificação aparece.