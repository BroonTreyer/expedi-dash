

# Corrigir Acesso da Portaria ao Painel de Expedição

## Problema

O usuário com role "portaria" está vendo o "Painel de Expedição" (página `/`) ao invés de ser redirecionado para `/portaria`. A causa provável é uma condição de corrida: quando o safety timer (6s) dispara antes do role carregar, `role` fica `null` e o fallback de redirecionamento retorna para `/` (a própria página), entrando em loop sem redirecionar corretamente.

## Solução

Duas camadas de proteção:

### 1. `src/components/ProtectedRoute.tsx` — Melhorar fallback

Quando `role` é `null` e `accessDenied` é true, o fallback atual é `/` (loop). Mudar para redirecionar para `/auth` quando role é null (forçar re-login), e manter `/portaria` quando role é "portaria".

```
// Antes:
const fallback = role === "portaria" ? "/portaria" : "/";

// Depois:
const fallback = role === "portaria" ? "/portaria" : role ? "/" : "/auth";
```

Quando `role` é null mas o usuário está logado, significa que a role não carregou — redirecionar para `/auth` força um reload limpo do estado de autenticação.

### 2. `src/pages/Index.tsx` — Guard adicional

Adicionar uma verificação no início do componente Index: se `role === "portaria"`, redirecionar para `/portaria` imediatamente. Isso funciona como segunda camada caso o ProtectedRoute falhe.

| Arquivo | Mudança |
|---|---|
| `src/components/ProtectedRoute.tsx` | Corrigir fallback para role null (redirecionar para /auth) |
| `src/pages/Index.tsx` | Adicionar guard para redirecionar portaria users |

