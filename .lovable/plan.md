

## Plano: Corrigir adição de produto em pedido existente

### Problema
Ao editar um pedido e adicionar um novo produto, o item não salva. A causa é que o `basePayload` copia todo o `form` (incluindo o `id` do pedido original). Para itens novos (index > 0), o código tenta não incluir o `id`, mas ele já está no `basePayload`. Resultado: `handleSubmit` vê `values.id` e chama `updateMut` (atualização) ao invés de `createMut` (criação).

### Solução

**`src/components/dashboard/CarregamentoDialog.tsx`** — No `handleSubmit`, remover o `id` do `basePayload` antes do loop e só adicionar para o item 0:

```typescript
// Linha ~141: Após criar basePayload, remover o id
delete basePayload.id;

// Linha ~153-156: Para index === 0, adicionar id explicitamente
items.forEach((item, index) => {
  onSubmit({
    ...basePayload,
    ...(index === 0 ? { id: editing.id } : {}),
    // ... rest
  });
});
```

### Arquivo alterado
- `src/components/dashboard/CarregamentoDialog.tsx` — 1 linha adicionada (`delete basePayload.id`)

