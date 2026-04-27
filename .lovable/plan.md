## Adicionar campo de preço no pedido do vendedor

### Banco de dados
- Adicionar duas colunas opcionais em `carregamentos_dia`:
  - `preco_unitario numeric` — valor por unidade/kg
  - `preco_total numeric` — calculado (preço unitário × quantidade), persistido para facilitar relatórios

### Formulário (`NovoPedidoDialog.tsx`)
- Nova coluna **Preço unit. (R$)** em cada linha de item, ao lado de Peso/Qtd.
- Cálculo automático bidirecional simples: ao alterar Preço unit. ou Quantidade, recalcular Preço total exibido na linha.
- Mostrar **Total do item** e **Total do pedido** (soma) no rodapé do dialog, formatado em pt-BR (R$ 1.234,56).
- Campo opcional: vendedor pode salvar rascunho sem preço; mas, ao **enviar para faturamento**, exibir aviso (não bloqueia) caso algum item esteja sem preço.

### Persistência (`MeusPedidos.tsx`)
- Incluir `preco_unitario` e `preco_total` no INSERT/UPDATE dos itens.
- Adicionar `preco_unitario` ao SELECT do registro em edição para preencher o form.

### Listagem
- **Card do pedido** (Rascunhos / Aguardando / Aprovados): mostrar “Total: R$ X.XXX,XX” logo abaixo do peso total.
- **Tela de Aprovações** (`/aprovacoes`): exibir o preço unitário e o total por item, e total geral do pedido para o faturamento conferir.

### Tipos
- Atualizar `NovoPedidoSubmit.items` para incluir `preco_unitario` e `preco_total`.

### Fora de escopo
- Sem alterar regras de RLS (campos novos seguem as mesmas políticas já existentes).
- Sem mudança no fluxo de aprovação.
