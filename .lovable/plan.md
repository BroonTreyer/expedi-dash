

# Propagar alterações de pedido para todos os produtos do mesmo pedido

## Problema
Quando um pedido tem múltiplos produtos (ex: 5 itens), cada produto é uma linha separada na tabela `carregamentos_dia`. Para alterar o vendedor, cliente, cidade, UF ou qualquer campo logístico, o usuário precisa editar **cada linha individualmente**. Deveria alterar uma vez e propagar para todas as linhas do mesmo pedido.

## Solução
Ao salvar a edição de um carregamento, identificar todas as linhas que pertencem ao mesmo pedido (mesmo `numero_pedido` + `data`, ou mesmo `carga_id`) e atualizar os campos compartilhados em todas elas automaticamente.

## Campos compartilhados (propagados)
- `vendedor_id`, `codigo_cliente`, `cliente`, `cidade`, `uf`, `tipo_frete`, `numero_pedido`
- `tipo_caminhao`, `placa`, `motorista`, `transportadora`, `carga_id`, `nome_carga`, `horario_previsto`
- `observacoes`, `status`, `etapa`

## Campos individuais (NÃO propagados)
- `codigo_produto`, `nome_produto`, `quantidade`, `peso`, `ruptura`

## Mudanças

### 1. `src/hooks/useCarregamentos.ts` — novo hook `useUpdateCarregamentoCascade`
- Recebe o payload de update + lista de IDs irmãos (mesmo pedido)
- Separa campos compartilhados dos individuais
- Atualiza o registro principal com todos os campos
- Atualiza os registros irmãos apenas com os campos compartilhados (batch update)

### 2. `src/pages/Index.tsx` — alterar `handleSubmit` no modo editar
- Antes de chamar o update, buscar na lista de carregamentos todos os registros com o mesmo `numero_pedido` e `data` (ou mesmo `carga_id`)
- Passar os IDs irmãos para o hook cascade
- Se o pedido tem apenas 1 linha, comportamento normal (sem mudança)

### 3. `src/components/dashboard/CarregamentoDialog.tsx` — sem alteração
O dialog já funciona corretamente. A propagação acontece no submit handler.

## Resultado
- Alterar vendedor, cliente ou qualquer campo logístico em um produto propaga automaticamente para todos os produtos do mesmo pedido
- Campos de produto (código, nome, quantidade, peso) continuam individuais
- Sem mudança na experiência do dialog — a mágica acontece no salvamento

