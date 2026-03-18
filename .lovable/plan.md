
Objetivo: eliminar o “Carregando…” infinito de forma definitiva, com auditoria completa do fluxo de autenticação (cliente, rede, banco e cache), sem depender de tentativa/erro.

## Diagnóstico já confirmado (auditoria)

1. Sintoma reproduzido: tela travada em “Carregando…” no `/` sem avançar.
2. Rede no travamento: nenhum request de dados de autenticação/role é disparado (apenas assets JS/CSS).
3. Banco: `profiles` e `user_roles` estão consistentes (há role para todos os usuários atuais).
4. Backend está acessível (endpoints respondem), então não é indisponibilidade externa tipo Cloudflare.
5. Causa técnica principal no código:
   - `src/hooks/useAuth.ts` faz operação assíncrona do banco **dentro** de `onAuthStateChange` (`await fetchRole(...)`).
   - Esse padrão é conhecido por causar deadlock/hang intermitente no client auth (sem erro e sem request de rede).
   - Além disso, há mutação de internals não suportados (`(supabase.auth as any).storage = ...`), que aumenta risco de estado travado.

## Plano de correção (implementação)

### 1) Refatorar o fluxo de autenticação para não travar
Arquivo: `src/hooks/useAuth.ts`

- Tornar callback de `onAuthStateChange` **100% síncrono** (sem `await`, sem query de banco dentro dele).
- Separar responsabilidades:
  - Callback: só sincroniza `session` e `user`.
  - Função isolada `resolveRole(userId)` roda fora do callback (em task assíncrona separada).
- Criar timeout defensivo para role:
  - `Promise.race(queryRole, timeout)` (ex.: 4–5s).
  - Se timeout/falha: fallback para `"logistica"` e liberar loading.
- Criar timeout defensivo para bootstrap de sessão:
  - Se `getSession` não concluir em X segundos, encerrar loading com fallback seguro (não deixar infinito).
- Remover mutação de internals:
  - Eliminar `(supabase.auth as any).storage = localStorage/sessionStorage`.
  - Manter cliente auth estável (sem troca de storage em runtime).
- Manter `loading` sempre finalizado em `finally` (nenhum caminho sem saída).

Fluxo alvo:
```text
mount
 ├─ subscribe onAuthStateChange (sync only)
 ├─ bootstrap getSession (com timeout)
 └─ se houver user -> resolveRole (fora do callback, com timeout)
      └─ sucesso: role real
      └─ falha/timeout: role="logistica"
final: loading=false sempre
```

### 2) Blindar rota protegida contra estado pendente
Arquivo: `src/components/ProtectedRoute.tsx`

- Manter bloqueio durante `loading`.
- Remover dependência de estado indefinido sem saída.
- Garantir que qualquer usuário sem sessão vá para `/auth` mesmo após fallback.

### 3) Tratamento de UX no login para recuperação rápida
Arquivo: `src/pages/Auth.tsx`

- Exibir erro amigável quando bootstrap auth entrar em fallback por timeout (em vez de spinner eterno).
- Incluir ação de “Tentar novamente” (recarregar estado auth) sem exigir limpar cache manualmente.

### 4) Hardening opcional de cache PWA (prevenção)
Arquivo: `vite.config.ts`

- Revisar runtime caching para não interceptar indevidamente fluxos sensíveis de autenticação.
- Manter cache apenas onde agrega valor (assets e leitura não sensível), reduzindo chance de estado inconsistente.

## Arquivos previstos para alteração

- `src/hooks/useAuth.ts` (principal)
- `src/components/ProtectedRoute.tsx`
- `src/pages/Auth.tsx`
- `vite.config.ts` (ajuste preventivo opcional)

## Critérios de aceite (validação final)

1. Com sessão existente, abrir `/` e recarregar 10x: nunca ficar preso em “Carregando…”.
2. Sem sessão, sempre redirecionar para `/auth` em poucos segundos.
3. Login válido: entra no app e role carrega sem travar.
4. Falha simulada de role/network: app não trava; aplica fallback e segue operável.
5. Publicado e preview com mesmo comportamento (sem loop infinito).

## Resultado esperado

- Eliminação do deadlock de autenticação.
- Fim do “Carregando…” infinito.
- Fluxo resiliente a lentidão/falha de rede.
- Segurança mantida (sem flash de conteúdo indevido e sem confiar em client storage para permissão).
