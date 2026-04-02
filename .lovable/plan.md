

# Corrigir erro "Acesso não permitido" e crash do Realtime

## Problemas identificados

### 1. Race condition no ProtectedRoute
Quando o auth se inicializa, existe uma janela onde `loading=false`, `user` existe, mas `role` ainda é `null`. Nesse momento, `accessDenied` se torna `true` e dispara o toast + redirect, mesmo que milissegundos depois a role carregue como "admin".

Causa raiz: o `onAuthStateChange` pode disparar múltiplos eventos (INITIAL_SESSION, TOKEN_REFRESHED) e a closure do callback referencia o valor antigo de `role` (null), fazendo role fetches redundantes.

### 2. Crash do Realtime (tela branca)
O erro "cannot add postgres_changes callbacks after subscribe()" causa crash fatal. Isso acontece quando o componente `useNotifications` re-monta e tenta adicionar listeners a um canal já subscrito, mesmo com o guard de `notificationChannels` Map — o canal pode estar num estado intermediário.

## Correções

### Arquivo: `src/components/ProtectedRoute.tsx`
- Tratar `role === null` como "ainda carregando" quando o usuário existe e `allowedRoles` está definido
- Mudar condição: se user existe mas role é null, mostrar loading (não negar acesso)
- Remover toast repetitivo — mostrar apenas uma vez

```tsx
// Mudança na lógica:
// Se user existe mas role é null, considerar como "carregando role"
const roleStillLoading = !!user && role === null && !!allowedRoles;
const accessDenied = !loading && !!user && !!allowedRoles && !!role && !allowedRoles.includes(role);

if (loading || roleStillLoading) {
  return <LoadingSpinner />;
}
```

### Arquivo: `src/hooks/useNotifications.ts`
- Adicionar verificação de estado do canal antes de criar novo
- Usar `removeChannel` mais defensivamente
- Wrap em try/catch para evitar crash fatal

### Arquivo: `src/hooks/useAuth.ts`
- Na closure do `onAuthStateChange`, usar ref para `role` em vez de state (evita stale closure no check de TOKEN_REFRESHED)

## Arquivos afetados
- `src/components/ProtectedRoute.tsx` — corrigir race condition role=null
- `src/hooks/useNotifications.ts` — proteger contra crash do realtime
- `src/hooks/useAuth.ts` — usar ref para role no callback

