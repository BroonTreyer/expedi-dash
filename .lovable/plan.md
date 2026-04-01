

# Corrigir Travamento com Login Simultâneo

## Problema Raiz

Quando duas pessoas usam o mesmo login ao mesmo tempo, o Supabase invalida o token de uma delas. Isso causa:

1. **Safety timeout dispara** → `role` fica `null` → tela trava no loading ou fica sem permissões
2. **Queries continuam disparando** com token inválido → retornam erro ou dados vazios → autocomplete não funciona, pedidos não carregam
3. **Nenhuma recuperação automática** → o usuário precisa dar F5 manualmente

## Solução (3 frentes)

### 1. Quando o safety timeout dispara sem role, redirecionar para `/auth`

**`src/hooks/useAuth.ts`**: Quando o safety timeout força `loading=false` e não há `role` mas há `user`, fazer sign out automático e mostrar toast "Sessão expirou". Hoje o código apenas seta `loading=false` e deixa o usuário num estado quebrado.

### 2. Proteger TODAS as queries com `enabled` baseado na sessão

Adicionar verificação de sessão ativa antes de disparar queries. Sem isso, queries rodam com token inválido e falham silenciosamente.

**Hooks afetados:**
- `useCarregamentos` → adicionar `enabled: !!session`
- `useCaminhoes` → adicionar `enabled: !!session`  
- `useMotoristas` → adicionar `enabled: !!session`
- `useClientes` → adicionar `enabled: !!session`
- `useProdutos` → adicionar `enabled: !!session`
- `useVendedores` → adicionar `enabled: !!session`
- `useTiposCaminhao` → adicionar `enabled: !!session`

Para isso, cada hook precisará acessar o estado de auth. A abordagem mais limpa: exportar uma função `useSession()` do `useAuth.ts` que retorna apenas `session`, e usá-la nos hooks.

### 3. Auto-recovery: tentar refresh do token quando query falha com 401/403

**`src/App.tsx`**: Configurar o `QueryClient` com `retry` inteligente que, ao detectar erro de auth (401/403/JWT expired), tenta `supabase.auth.refreshSession()` antes de retentar a query. Se o refresh falhar, faz sign out.

## Mudanças Técnicas

| Arquivo | Mudança |
|---|---|
| `src/hooks/useAuth.ts` | Exportar `useSession()` hook; no safety timeout, fazer signOut se role=null e user existe |
| `src/App.tsx` | QueryClient `retry` com detecção de erro 401 + auto-refresh |
| `src/hooks/useCarregamentos.ts` | Adicionar `enabled: !!session` via `useSession()` |
| `src/hooks/useCaminhoes.ts` | Adicionar `enabled: !!session` |
| `src/hooks/useMotoristas.ts` | Adicionar `enabled: !!session` |
| `src/hooks/useClientes.ts` | Adicionar `enabled: !!session` |
| `src/hooks/useProdutos.ts` | Adicionar `enabled: !!session` |
| `src/hooks/useVendedores.ts` | Adicionar `enabled: !!session` |
| `src/hooks/useTiposCaminhao.ts` | Adicionar `enabled: !!session` |

**Resultado**: Em vez de travar, o sistema detecta a sessão inválida, redireciona para login, e o usuário pode entrar novamente sem precisar dar F5. Queries não disparam com token quebrado.

