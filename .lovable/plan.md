

# Adicionar "Lembrar acesso" no login

## O que será feito

### 1. `src/pages/Auth.tsx`
- Adicionar checkbox "Lembrar acesso" entre o campo de senha e o botão Entrar
- Passar o estado `rememberMe` para a função `signIn`

### 2. `src/hooks/useAuth.ts`
- Alterar `signIn` para aceitar parâmetro `rememberMe`
- Quando **desmarcado**: usar `sessionStorage` em vez de `localStorage` (sessão expira ao fechar o navegador)
- Quando **marcado**: manter `localStorage` (comportamento atual, sessão persiste)
- Isso é feito recriando o cliente Supabase ou trocando o storage antes do login

### Detalhes técnicos
O Supabase client já usa `localStorage` por padrão (sessão persiste). Para "não lembrar", o approach é:
- Antes do `signInWithPassword`, setar `supabase.auth.storage` para `sessionStorage` (se não lembrar) ou `localStorage` (se lembrar)
- Na prática, como o client é configurado uma vez, vamos salvar a preferência em `localStorage` e, no `useAuthState`, configurar o storage adequadamente na inicialização

### Arquivos alterados
- `src/pages/Auth.tsx` — checkbox + estado
- `src/hooks/useAuth.ts` — lógica de storage condicional

