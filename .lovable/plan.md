

## Problema: `fetchRole` sem tratamento de erro trava o sistema

No `useAuth.ts`, se a query `fetchRole` falhar (erro de rede, timeout, etc.), a Promise rejeita, o `setLoading(false)` nunca executa, e o app fica preso em "Carregando..." eternamente.

### Correção

**`src/hooks/useAuth.ts`** — Envolver `fetchRole` em try/catch nos dois caminhos (onAuthStateChange e getSession):

```typescript
// onAuthStateChange callback (lines 49-58)
if (session?.user) {
  try {
    await fetchRole(session.user.id);
  } catch {
    setRole("logistica"); // fallback
  }
} else {
  setRole(null);
}
setLoading(false);

// getSession callback (lines 61-68) — same pattern
```

Também adicionar try/catch dentro do próprio `fetchRole` como rede de segurança adicional.

Essa é uma mudança mínima de 4 linhas que garante que o sistema nunca trave, mesmo se a busca de role falhar.

