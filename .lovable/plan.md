

# Diagnóstico e Correção dos Bugs ao Preencher Pedido

## Problema Raiz Identificado

Há **3 problemas concretos** que explicam os bugs da Debora e de outros usuários:

### 1. Race condition no Auth — tela branca ao trocar de página
O `useAuth` tem um safety timeout de 8 segundos. Quando o token de sessão demora a ser resolvido (rede mais lenta, computador mais fraco), o sistema força sign out e a tela fica branca. O `TOKEN_REFRESHED` event do Supabase pode disparar e causar uma nova busca de role que compete com a anterior, resultando em `role = null` temporariamente, o que faz o `ProtectedRoute` redirecionar para `/auth`.

### 2. Queries sem proteção de sessão no CarregamentoDialog
O lookup de cliente dentro do `CarregamentoDialog` (linha 100-112) faz query ao banco **sem verificar se a sessão existe** (`enabled` não checa `session`). Se o token expirou ou está em renovação, a query dispara com token inválido → erro silencioso → autocomplete não funciona.

### 3. Foreign key `fk_carregamentos_codigo_produto` causando erro ao salvar
Existe uma **foreign key** de `carregamentos_dia.codigo_produto` referenciando `produtos.codigo_produto`. Se o usuário digita um código de produto que não existe no cadastro (ou com case diferente), o INSERT falha com erro de constraint. O log do banco confirma: `violates foreign key constraint "fk_carregamentos_codigo_produto"`. Isso trava o salvamento do pedido.

## Correções Planejadas

### Arquivo 1: `src/hooks/useAuth.ts`
- Ignorar evento `TOKEN_REFRESHED` quando já temos role resolvida (não re-buscar role desnecessariamente)
- Não forçar sign out no safety timeout — apenas desbloquear loading e usar role existente
- Isso elimina a tela branca ao navegar entre páginas

### Arquivo 2: `src/components/dashboard/CarregamentoDialog.tsx`
- Adicionar proteção de sessão no lookup de cliente: `enabled: codigoClienteInput.length >= 1 && !!session`
- Importar `useSession` para obter a sessão atual
- Adicionar debounce no lookup (300ms) para evitar queries a cada tecla digitada
- Tratar o erro de FK no handleSubmit: validar que o `codigo_produto` existe antes de submeter

### Arquivo 3: `src/pages/Index.tsx`
- Melhorar tratamento de erro no `onSubmit` do dialog para exibir mensagem clara quando FK falha (em vez de travar silenciosamente)

## Detalhes Técnicos

| Arquivo | Mudança |
|---|---|
| `src/hooks/useAuth.ts` | Não forçar sign-out no timeout; ignorar re-fetch de role em TOKEN_REFRESHED se role já existe |
| `src/components/dashboard/CarregamentoDialog.tsx` | Session-gate no lookup; debounce no input; validação de produto antes de submit |
| `src/pages/Index.tsx` | Tratamento de erro de FK com mensagem amigável |

## Resultado Esperado
- Debora (e qualquer usuário em computador mais lento) não verá mais tela branca ao navegar
- Autocomplete de cliente e vendedor funcionará de forma consistente
- Erros de produto inválido serão mostrados como mensagem clara, sem travar

