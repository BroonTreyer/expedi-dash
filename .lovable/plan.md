## Problema

Na aba **Logística → Tabela de Frete**, o campo "Cód. cliente" hoje é apenas um input de texto livre. Quando você digita o código, nada acontece — não há busca no cadastro de clientes, não preenche o nome, nem sugere cidade/UF de destino. Por isso "não puxa o cliente".

## O que vou fazer

Transformar o campo "Cód. cliente" (tanto na linha de **adicionar nova linha** quanto na **edição de linhas existentes**) em um campo inteligente, no mesmo padrão já usado no painel do Vendedor:

1. **Busca por código com debounce de 300ms** direto na tabela `clientes` (igual ao padrão do Novo Pedido).
2. Ao encontrar o cliente:
   - Mostra o **nome do cliente** ao lado do código (badge cinza, somente leitura).
   - **Auto-preenche** os campos `Destino` (cidade) e `UF` se estiverem vazios — economizando digitação.
3. Se o código não existir, mostra um pequeno aviso "Cliente não cadastrado" em vermelho, mas **não bloqueia** o salvamento (a tabela de frete pode ter linhas genéricas sem código, como já funciona hoje com "(qualquer)").
4. Na **listagem de linhas existentes**, exibir o nome do cliente ao lado do código também, para o usuário não precisar decorar códigos.

## Onde mexer

- `src/components/logistica/TabelaFreteTab.tsx` — adicionar lookup + auto-fill nos dois pontos (linha de adicionar e linhas editáveis).
- Reutilizar o hook `useClientes` que já existe e já está em cache (sem nova query pesada).

## O que NÃO vou mudar

- Estrutura do banco — nada de migration.
- Comportamento de salvar — continua salvando exatamente o código digitado.
- Linhas "(qualquer)" sem código continuam permitidas.
