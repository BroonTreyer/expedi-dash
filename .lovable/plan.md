

# Adicionar campo "Data do Carregamento" no dialog Fechar Carga

O dialog já recebe `selectedDate` como prop, mas não exibe nem permite alterar a data. O usuário quer definir a data de carregamento e que ela seja sincronizada com o campo `data` dos registros no banco.

## Alterações

### `src/components/dashboard/FechamentoLoteDialog.tsx`
1. Adicionar estado `dataCarregamento` (string, inicializado com `selectedDate` ou data atual)
2. Adicionar campo de input `type="date"` no grid do formulário com label "Data do Carregamento *"
3. Incluir `data: dataCarregamento` no array de `updates` enviado ao `onSubmit`, para que cada pedido tenha sua data atualizada
4. Incluir `data` no payload do `onPrintReady`
5. Atualizar tipo do `onSubmit` na interface `Props` para incluir `data: string`

### `src/pages/Index.tsx`
1. Atualizar o tipo do `handleLoteSubmit` para incluir `data: string` nos updates
2. O `updateMut.mutate(u)` já envia todos os campos — basta incluir `data` no objeto

Assim, ao fechar uma carga, a data escolhida no dialog será gravada em todos os pedidos agrupados, sincronizando o campo `data` na tabela `carregamentos_dia`.

