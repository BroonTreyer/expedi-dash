
Do I know what the issue is? Sim.

## Problema exato
O print confirma que o problema não está só no dialog: a própria tabela está agrupando por cliente, não por pedido.

Hoje, em `CarregamentoTable.tsx`, o `buildGroups` usa `codigo_cliente` como chave. Então o cabeçalho com “9 produtos” pode representar vários itens do mesmo cliente, mas não necessariamente um único pedido. Quando você clica em clonar nesse cabeçalho, a ação usa só o primeiro registro do grupo. Depois, no `Index`, o clone busca os itens do mesmo `numero_pedido + data` desse primeiro registro — por isso o dialog acaba abrindo com apenas 1 item.

## O que vou corrigir

### 1. `src/components/dashboard/CarregamentoTable.tsx`
Trocar o agrupamento visual para pedido real, não cliente.

- mudar `buildGroups` para agrupar por `numero_pedido + data`
- se `numero_pedido` não existir, manter a linha como item individual
- desktop e mobile devem mostrar grupo expandível apenas quando houver múltiplos produtos do mesmo pedido
- o botão de clonar do grupo deve usar os itens completos daquele pedido

Isso elimina o falso agrupamento “cliente com vários produtos” que hoje mascara pedidos diferentes.

### 2. `src/pages/Index.tsx`
Fortalecer o callback de clonagem.

- ajustar o fluxo para aceitar o conjunto completo do pedido vindo da tabela
- usar esse conjunto como fonte principal de `cloneItems`
- manter fallback por `numero_pedido + data`, com comparação normalizada
- continuar gerando `id` temporário `clone-*` e limpando `numero_pedido`

Assim o clone deixa de depender só da linha clicada.

### 3. `src/components/dashboard/CarregamentoDialog.tsx`
Garantir que o dialog sempre inicialize com todos os produtos do pedido clonado.

- usar `cloneItems` como fonte oficial da lista de produtos
- montar o formulário base com o primeiro item
- montar `items[]` com todos os produtos recebidos
- manter o submit como criação de novo pedido para IDs `clone-*`

## Resultado esperado
Ao clicar em “Clonar”:

- se o pedido tiver 9 produtos, o dialog abrirá com os 9 produtos
- se o cliente tiver vários pedidos, cada pedido aparecerá separado na tabela
- o clone copiará apenas o pedido escolhido, inteiro, sem misturar pedidos do mesmo cliente
- o novo salvamento continuará criando um pedido novo, sem sobrescrever o original

## Detalhes técnicos
- Não precisa mudar banco nem backend
- O warning de `ref` no `Select` é um problema separado e não é a causa deste bug
- A correção principal é alinhar a UI com a regra real de negócio: clone por pedido, não por cliente
