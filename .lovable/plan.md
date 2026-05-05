## Problema

Como **admin**, a página `/rupturas` carrega normalmente (verifiquei no preview: 18 itens, KPIs ok). Como **faturamento**, a tela aparece por ~1s e depois "some tudo". Isso é o padrão de:

1. Um erro de runtime dentro do componente derruba a árvore React (sem ErrorBoundary visível, vira tela branca), ou
2. Uma query lança erro (RLS ou dado inesperado) que dispara um redirect/unmount.

Não consegui reproduzir como faturamento (estou logado como admin no preview). Também não há logs específicos no console que apontem o erro.

## Plano

### 1. Capturar o erro real (essencial)
Envolver a página `Rupturas` com um `ErrorBoundary` que **mostra** o erro em tela em vez de deixar branco. Hoje o app não tem boundary global, então qualquer throw vira tela vazia. O boundary vai:
- Mostrar mensagem amigável + botão "Recarregar".
- Logar o stack no `console.error` com prefixo `[Rupturas]` para aparecer no replay.

### 2. Blindar pontos suspeitos no `Rupturas.tsx`
Revisão defensiva onde o componente assume formato dos dados:
- `FaltandoAgora` itera `carregamentos.filter(...)` — garantir fallback `?? []` em todos os campos opcionais usados em `.toLowerCase()` (já tem `?.` em alguns, mas há pontos sem proteção).
- `productSummary` usa `c.codigo_produto` como chave de Map — pular itens sem código em vez de usar `""`.
- `HistoricoMes` (aba) também consulta `useCarregamentos` com range do mês — se faturamento abre direto na aba ativa e algo no range mensal falha, pode derrubar tudo. Aplicar o mesmo `try/catch` defensivo.

### 3. Verificar permissões/queries que faturamento dispara
A página chama: `useCarregamentos`, `useVendedores`, `useTiposCaminhao`, `useProdutos`, `useClientes`. Pelas RLS atuais, todas permitem `faturamento`. Mas `useClientes` faz paginação até esvaziar — se um page der erro, o throw mata o componente inteiro. Vou:
- Garantir que falha em queries auxiliares (vendedores/produtos/clientes/tipos) não derrube a página principal — basta tratar `error` e seguir com `[]`.

### 4. Após o deploy, pedir ao usuário para reproduzir
Com o ErrorBoundary visível, o usuário consegue copiar o erro exato (ou aparecerá no replay/console). A partir daí faço o fix definitivo. Esse é o caminho mais rápido — tentar adivinhar a causa exata sem o erro real é chute.

## Arquivos a alterar
- `src/pages/Rupturas.tsx` — envolver export default com ErrorBoundary; defensivos.
- **novo**: `src/components/RupturasErrorBoundary.tsx` — boundary local com fallback visível.

## O que NÃO vou fazer
- Mexer em RLS (todas já permitem faturamento).
- Refatorar `useCarregamentos` (é compartilhado pelo Painel, que funciona ok).
