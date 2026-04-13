

# Clonar Pedido

## O que será feito
Adicionar um botão "Clonar" na tabela de carregamentos que cria uma cópia do pedido e abre o dialog de edição para o usuário ajustar os dados antes de salvar.

## Como funciona
1. O usuário clica no botão de clonar (ícone Copy) em qualquer pedido
2. O sistema abre o dialog de criação (modo "vendas") com todos os campos preenchidos com os dados do pedido original
3. O campo `numero_pedido` fica vazio (será gerado automaticamente)
4. O usuário pode alterar qualquer campo e salvar como um novo pedido

## Mudanças técnicas

### `src/components/dashboard/CarregamentoTable.tsx`
- Adicionar prop `onClone: (c: Carregamento) => void` na interface Props
- Adicionar botão com ícone `Copy` ao lado do botão de editar, que chama `onClone(c)`

### `src/pages/Index.tsx`
- Criar função `handleClone` que recebe um Carregamento, limpa `id` e `numero_pedido`, seta como `editing` com modo `"vendas"` e abre o dialog
- Passar `onClone={handleClone}` para `CarregamentoTable`

### `src/components/dashboard/CarregamentoDialog.tsx`
- Nenhuma mudança necessaria: o dialog em modo "vendas" com `editing` preenchido ja preenche os campos. Apenas garantir que no submit, quando `editing` existe mas modo e "vendas", faz INSERT (nao UPDATE).

3 arquivos afetados.

