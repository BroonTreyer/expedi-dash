

# Auditoria Completa — Bugs e Correções

## Bug 1 (CRÍTICO): Usuário Portaria vê o Painel de Expedição

**Causa**: A rota `/` em `App.tsx` não tem `allowedRoles`, então qualquer usuário autenticado acessa — incluindo `portaria`.

**Correção**: Adicionar `allowedRoles={["admin", "logistica", "faturamento"]}` à rota `/`.

## Bug 2 (CRÍTICO): Redirect infinito para usuário Portaria

**Causa**: Quando o acesso é negado no `ProtectedRoute`, ele redireciona para `/`. Mas se `/` também bloquear `portaria`, entra em loop infinito.

**Correção**: Alterar `ProtectedRoute` para redirecionar baseado no role:
- Se `role === "portaria"` → redirecionar para `/portaria`
- Senão → redirecionar para `/`

## Bug 3: Sidebar mostra "Painel" para portaria

**Causa**: Na sidebar, o item "Painel" (`/`) tem `roles: ["admin", "logistica", "faturamento"]`, o que está correto. Porém, como a rota `/` não tinha restrição, se o usuário digitasse a URL diretamente, entrava. Com a correção do Bug 1, isso fica resolvido. A sidebar está OK.

## Bug 4: Fallback de role é "logistica" em vez de algo seguro

**Causa**: Em `useAuth.ts`, quando o fetch de role falha/timeout, retorna `"logistica"` como fallback. Isso dá acesso amplo a um usuário cujo role real pode ser mais restrito.

**Correção**: Manter o fallback como está (já existia essa decisão arquitetural para não travar o usuário), mas documentar o risco. Não mudar nesse momento para evitar breaking change.

## Bug 5: Portaria user sees export CSV button conditionally — OK

Verificado: `isReadOnly = role === "portaria"` esconde Registrar, CSV e Importar. Está correto.

## Bug 6: Delete de movimentações bloqueado para não-admin

A policy de DELETE em `movimentacoes_portaria` é admin-only. Se um admin quiser delegar isso, será preciso outra migração. **Não é bug — é comportamento intencional.**

---

## Resumo de Mudanças

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Adicionar `allowedRoles={["admin", "logistica", "faturamento"]}` na rota `/` |
| `src/components/ProtectedRoute.tsx` | Redirecionar portaria para `/portaria` em vez de `/` quando acesso negado |

## Detalhes Técnicos

### `src/App.tsx` (linha 37)
```tsx
// De:
<Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
// Para:
<Route path="/" element={<ProtectedRoute allowedRoles={["admin", "logistica", "faturamento"]}><Index /></ProtectedRoute>} />
```

### `src/components/ProtectedRoute.tsx` (linha 32-34)
```tsx
// De:
if (accessDenied) {
  return <Navigate to="/" replace />;
}
// Para:
if (accessDenied) {
  const fallback = role === "portaria" ? "/portaria" : "/";
  return <Navigate to={fallback} replace />;
}
```

