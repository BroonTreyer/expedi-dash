## Problema

Na rota `/meu-painel/:vendedorId` (visão Admin do painel de um vendedor) o botão **“Novo pedido”** e o formulário de lançamento estão ocultos, porque o componente `MeusPedidos` é renderizado com `readOnly={isAdminView}`. Resultado: não há onde o vendedor (nem o admin testando) registrar o pedido.

Além disso, mesmo na visão própria do vendedor, é importante reforçar que o caminho de criação está visível e claro.

## O que vai mudar

1. **Permitir Admin lançar pedido pelo vendedor** (visão `/meu-painel/:vendedorId`)
   - Remover o `readOnly` para o card **Meus Pedidos**: o admin passa a poder criar/editar/enviar rascunhos em nome do vendedor selecionado.
   - O `vendedor_id` salvo continua sendo o do vendedor da URL — então o pedido aparece corretamente para o vendedor e segue o mesmo fluxo de aprovação do faturamento.
   - Exibir um aviso discreto no topo do card quando admin estiver atuando: *“Você está lançando este pedido em nome de [Nome do Vendedor]”*.

2. **Reforçar a chamada para ação na visão do vendedor**
   - No estado vazio (sem rascunhos, sem aprovados), exibir um bloco grande com botão **“Registrar primeiro pedido”** para que o caminho fique óbvio.
   - Manter o botão **“+ Novo pedido”** no topo (já existe), garantindo que esteja visível em mobile (não cortado pelo header).

3. **Defaults úteis no formulário de Novo Pedido**
   - Já vem com **1 item** vazio pronto para preencher (já existe).
   - Ao salvar o primeiro item, focar automaticamente no botão de **“+ Adicionar item”** caso o vendedor tenha mais produtos.
   - Mensagem clara quando não houver clientes/produtos cadastrados, sugerindo usar o botão **“Novo”** (cadastro inline de cliente).

## Arquivos afetados

- `src/pages/MeuPainel.tsx` — passar `readOnly={false}` para `MeusPedidos` mesmo no `isAdminView`; exibir aviso “lançando em nome de…”.
- `src/components/vendedor/MeusPedidos.tsx` — empty-state com CTA grande “Registrar primeiro pedido”; manter botão topo.
- `src/components/vendedor/NovoPedidoDialog.tsx` — pequenos ajustes de UX (mensagens vazias, foco).

## Fora de escopo

- Sem mudanças de schema do banco.
- Sem mudanças nas RLS (admin já tem permissão de INSERT/UPDATE em `carregamentos_dia`).
- Fluxo de aprovação no `/aprovacoes` permanece igual.
