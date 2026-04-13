
# Corrigir clonagem para sempre trazer o pedido inteiro

## Diagnóstico
A lógica de buscar os “irmãos” do pedido já foi adicionada no `Index`, mas o comportamento ainda permite clonar só a linha clicada em alguns cenários.

Pelo código atual, há dois pontos frágeis:

1. `handleClone` usa `numero_pedido + data`, mas faz fallback para `[c]` quando o item clicado não tem `numero_pedido` confiável no momento.
2. A tabela ainda mostra o botão de clonar nas linhas filhas do grupo expandido e nos cartões individuais, o que mantém a ação “presa” ao item, em vez de ao pedido como conjunto.

## O que vou ajustar

### 1. `src/components/dashboard/CarregamentoTable.tsx`
Tornar o botão de clonar uma ação do pedido/grupo, não de cada produto.

Mudanças:
- No desktop:
  - manter o botão de clonar na linha principal do grupo
  - remover o botão de clonar das linhas filhas expandidas
- No mobile:
  - para grupos com múltiplos produtos, deixar o clone apenas no card principal do grupo
  - remover dos itens internos agrupados
- Quando houver grupo com vários itens, o clone deve sempre chamar `onClone(first)` no cabeçalho do grupo

Objetivo:
- impedir que o usuário dispare clone “por item” em pedidos com múltiplos produtos

### 2. `src/pages/Index.tsx`
Fortalecer o `handleClone` para montar o pedido completo com mais segurança.

Mudanças:
- buscar todos os itens do mesmo pedido por `numero_pedido + data`
- usar comparação normalizada para evitar falhas de tipo (`number`, `string`, `null`)
- se o item clicado pertencer a um grupo visível no dashboard, priorizar o conjunto completo daquele pedido
- garantir que `cloneItems` receba todos os produtos antes de abrir o dialog
- manter ID temporário `clone-*` para forçar reinit correto

Objetivo:
- evitar cair no fallback de “só a linha clicada”

### 3. `src/components/dashboard/CarregamentoDialog.tsx`
Deixar a inicialização do dialog mais robusta para clones multi-itens.

Mudanças:
- quando `cloneItems` existir, usar sempre `cloneItems` como fonte dos produtos clonados
- limpar campos que não devem ser herdados como identidade do pedido original
- garantir que o formulário base venha do primeiro item, mas a lista de produtos venha de todos os itens
- preservar o fluxo de submit como `INSERT` para IDs `clone-*`

Objetivo:
- garantir que o dialog abra com todos os produtos do pedido, não só com o primeiro item carregado

## Resultado esperado
Ao clicar em “Clonar” em um pedido com vários produtos:
- o dialog abre em modo de novo pedido
- todos os produtos daquele pedido aparecem na seção “Produtos”
- o usuário pode editar qualquer item antes de salvar
- o salvamento cria um novo pedido completo, sem sobrescrever o original

## Arquivos afetados
- `src/components/dashboard/CarregamentoTable.tsx`
- `src/pages/Index.tsx`
- `src/components/dashboard/CarregamentoDialog.tsx`

## Detalhe técnico
Hoje a UI ainda trata “clonar” como ação disponível em linhas de produto individuais. Mesmo com a busca por `numero_pedido`, isso deixa a experiência ambígua e pode mascarar o clone completo. A correção principal é elevar a ação para o nível do pedido/grupo e fazer o dialog confiar explicitamente em `cloneItems` como fonte da lista completa de produtos.
