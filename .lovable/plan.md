

# Suporte a Login Simultâneo (Mesma Conta em Vários Dispositivos)

## Problema

Quando duas ou mais pessoas usam o **mesmo email/senha** em computadores diferentes, o sistema trava, não carrega e dá erros. Isso acontece porque o mecanismo de autenticação gera tokens de sessão independentes por dispositivo, e quando um dispositivo renova o token, pode invalidar a sessão do outro — causando um loop de re-autenticação, falha na busca de role, e o safety timeout de 6 segundos disparando.

## Diagnóstico

Os console logs confirmam: `[Auth] Safety timeout reached, forcing loading=false` — a role nunca é carregada porque a sessão fica sendo invalidada pela outra aba/computador.

## Solução (duas frentes)

### 1. Tornar o auth resiliente a conflitos de sessão

**`src/hooks/useAuth.ts`**:
- No `onAuthStateChange`, tratar o evento `TOKEN_REFRESHED` e `SIGNED_OUT` de forma mais robusta
- Quando o token refresh falhar (evento `SIGNED_OUT` inesperado), limpar estado e redirecionar para `/auth` em vez de travar no loading
- Adicionar retry na busca de role: se falhar, tentar 1x mais após 1s antes de desistir
- Quando `SIGNED_OUT` for recebido sem o usuário ter clicado "Sair", mostrar toast explicativo: "Sua sessão expirou. Faça login novamente."

### 2. Recomendação: criar contas separadas (abordagem correta)

A prática correta é cada pessoa ter sua própria conta. O sistema já tem a página de Usuários (`/usuarios`) onde o admin cria contas. Vou adicionar um aviso visual na tela de Usuários lembrando que cada pessoa deve ter seu próprio login.

## Mudanças Técnicas

### `src/hooks/useAuth.ts`
- Detectar evento `SIGNED_OUT` não solicitado pelo usuário (flag `intentionalSignOut`)
- Adicionar retry com backoff na `fetchRoleWithTimeout`
- Tratar `TOKEN_REFRESH_FAILED` / erros de refresh graciosamente
- Aumentar `SESSION_TIMEOUT_MS` de 6s para 8s para dar mais margem

### `src/pages/Usuarios.tsx`
- Adicionar alerta informativo no topo: "Cada pessoa deve ter seu próprio login para evitar conflitos de sessão"

| Arquivo | Mudança |
|---|---|
| `src/hooks/useAuth.ts` | Retry na role, tratamento de SIGNED_OUT inesperado, flag de logout intencional |
| `src/pages/Usuarios.tsx` | Alerta informativo sobre contas individuais |

