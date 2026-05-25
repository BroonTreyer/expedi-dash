## Problema

A página **Produtos** (`/produtos` no menu lateral) está abrindo em branco para você. Do meu lado, não consigo ver nenhum erro:

- Tabela `produtos` existe e tem **110 registros**
- RLS permite SELECT para qualquer usuário autenticado
- Nenhum erro de runtime registrado
- Console do navegador sem erros visíveis
- Código da página (`src/pages/Produtos.tsx`) está consistente

Sem o erro real (que está acontecendo só no seu navegador), preciso **blindar a página e instrumentar diagnósticos** para o próximo carregamento já mostrar o que está quebrando, em vez de tela branca.

## O que vou fazer

### 1. Envolver a página Produtos em ErrorBoundary
Hoje, se qualquer componente da página Produtos quebrar no render, a Suspense engole e mostra branco. Vou envolver `<Produtos />` em `<ErrorBoundary name="Produtos">` na `App.tsx` para mostrar uma mensagem clara com botão "Tentar novamente" em vez de branco.

### 2. Tratar erro do hook `useProdutos`
Atualmente, se a query Supabase falhar, a página apenas renderiza com `data = []` silenciosamente. Vou:
- Expor `error` do `useQuery` e mostrar um banner vermelho com a mensagem real do erro
- Adicionar `retry: 2` no `useQuery` para tolerar falha transitória de rede
- Logar `console.error` com o erro para você compartilhar no próximo print

### 3. Garantir que a página nunca fique 100% vazia
Mesmo durante `isLoading`, mostrar o cabeçalho (título "Produtos" + botão "Novo Produto" + busca), e só a tabela mostra "Carregando..." — assim você nunca vê tela 100% branca, sempre vê algo.

## Próximo passo (depois do build)

Após eu aplicar isso, abra `/produtos` de novo:
- Se aparecer um **banner vermelho com mensagem de erro** → me mande o texto, conserto direto.
- Se aparecer normalmente → era um erro transitório que o retry resolveu.
- Se continuar branco mesmo assim → me mande print do **Console (F12)** para identificar.

## Arquivos a alterar

- `src/App.tsx` — envolver `<Produtos />` em `<ErrorBoundary name="Produtos">`
- `src/hooks/useProdutos.ts` — adicionar `retry: 2` e propagar erro
- `src/pages/Produtos.tsx` — exibir banner de erro, garantir cabeçalho sempre visível
