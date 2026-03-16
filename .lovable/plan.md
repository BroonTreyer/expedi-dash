

# Permitir adicionar itens ao editar um pedido

## Problema
Na linha 259 do `CarregamentoDialog.tsx`, o botão "Adicionar" produto está condicionado a `{!editing && (...)}`, ou seja, ao editar um pedido existente, não é possível incluir novos itens.

## Mudança

**`src/components/dashboard/CarregamentoDialog.tsx`**

1. **Mostrar botão "Adicionar"** — Remover a condição `!editing` (linha 259), tornando o botão sempre visível.

2. **Ajustar `handleSubmit`** — Quando `editing` estiver ativo e houver mais de um item:
   - O primeiro item (índice 0) será atualizado no registro existente (comportamento atual com `id: editing.id`).
   - Os itens adicionais (índice 1+) serão enviados como novos registros via `onSubmit` sem `id`, herdando os mesmos metadados (vendedor, cliente, data, tipo caminhão, placa, etc.) do pedido editado.

3. **Ajustar `handleSubmit` em `Index.tsx`** — Nenhuma mudança necessária, pois `handleSubmit` já diferencia `values.id` presente (update) vs ausente (create).

## Detalhe da lógica de submit

```text
editing + items:
  item[0] → onSubmit({ ...base, id: editing.id, ...item[0] })  // UPDATE
  item[1] → onSubmit({ ...base, ...item[1] })                   // CREATE (sem id)
  item[2] → onSubmit({ ...base, ...item[2] })                   // CREATE (sem id)
```

## Arquivo editado
- `src/components/dashboard/CarregamentoDialog.tsx`

