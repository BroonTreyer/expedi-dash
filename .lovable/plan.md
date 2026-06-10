## Objetivo

Adicionar a opção de **remover um pedido individual de uma pré-carga**, sem precisar cancelar a pré-carga inteira. O pedido removido volta para "Aguardando faturamento" para poder ser realocado em outra carga.

## Comportamento

Na página **Pré-cargas**, em cada linha de pedido (componente `PedidoRow` em `src/pages/PreCargas.tsx`), adicionar um botão `Remover` (ícone `X`, variante `ghost`, cor `destructive`) ao lado do botão `Editar`.

Ao clicar:
1. Abre `DeleteConfirmDialog` com a mensagem: *"Remover o pedido #N (Cliente X) da pré-carga? Ele voltará para 'Aguardando faturamento' e poderá ser incluído em outra carga."*
2. Após confirmar, executa um `UPDATE` em todas as linhas de `carregamentos_dia` do pedido (filtrando por `carga_id`, `numero_pedido` e `codigo_cliente`/`cliente`) zerando os campos de pré-carga:
   - `etapa = 'aguardando_faturamento'`
   - `carga_id = null`
   - `nome_carga = null`
   - `placa = null`
   - `motorista = null`
   - `transportadora = null`
   - `tipo_caminhao = null`
   - `ordem_carga = null`
   - `data_prevista_carregamento = null`
3. Invalida as queries `["pre-cargas"]`, `["carregamentos"]`, `["aprovacoes-pendentes"]` para atualizar a UI.
4. Exibe toast de sucesso. Se a pré-carga ficar sem nenhum pedido, ela desaparece naturalmente da lista (já tratado pela agregação existente).

## Detalhes técnicos

- **Novo hook**: `useRemoverPedidoPreCarga` em `src/hooks/usePreCargas.ts` — recebe `{ cargaId, numeroPedido, codigoCliente, cliente }` e faz o `UPDATE` em lote. Usa `codigo_cliente` quando presente; caso contrário, `cliente` (espelhando a chave composta usada em `pedidoBuckets`).
- **UI**: passa `onRemove` de `PreCargas` → `PreCargaCard` → `PedidoRow`. Estado local `pedidoParaRemover` no `PreCargas` controla o `DeleteConfirmDialog` (reutiliza `src/components/dashboard/DeleteConfirmDialog.tsx`, sem `confirmText`).
- **Permissão**: visível para os mesmos papéis que já podem editar pedidos da pré-carga (admin, faturamento, logística). Para vendedor, fica oculto.
- O `UPDATE` aciona naturalmente os triggers existentes (`audit_carregamentos`, `cap_peso_pelo_original`, etc.) — sem mudanças de schema.

## Validação

- Em uma pré-carga com 3 pedidos, remover 1 deixa apenas 2; o pedido removido aparece em "Aguardando faturamento" para ser realocado.
- Remover o único pedido de uma pré-carga remove a pré-carga da lista.
- KPIs (peso total, rupturas, qtd pedidos) recalculam corretamente.
