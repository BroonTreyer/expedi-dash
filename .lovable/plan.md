Plano para corrigir o botão que não aparece:

1. Atualizar `FechamentoLoteDialog`
   - Adicionar uma prop opcional para remover um pedido da pré-carga atual.
   - Exibir um botão discreto com `X` em cada linha da lista da modal “Pré-carga em edição”, ao lado do pedido/cliente.
   - Manter o comportamento atual de arrastar/reordenar, roteirizar, mapa e finalizar.

2. Conectar a ação na tela de Pré-cargas
   - Ao clicar em `Editar` numa pré-carga, passar para a modal a função de remoção individual.
   - Usar o mesmo fluxo já definido: confirmação simples e retorno do pedido para `Aguardando faturamento`.

3. Confirmação e atualização
   - Mostrar o diálogo simples: “Remover pedido da pré-carga?”
   - Confirmando, chamar a mutation existente `useRemoverPedidoPreCarga`.
   - Fechar a confirmação, atualizar a lista/modal automaticamente e mostrar toast de sucesso ou erro.

4. Permissões
   - Mostrar o botão somente para `admin`, `faturamento` e `logistica`, mantendo escondido para `vendedor`.