
User says "Inverter ordem" doesn't give feedback whether it worked or what changed. Let me check the current implementation.

Looking at recent context: `inverterOrdemMut` exists in `Consolidado.tsx` and invalidates queries on success. But the user doesn't see confirmation.

Likely issues:
1. No success toast after invert
2. The dialog's `group` prop may not refresh — after mutation, query updates but the open dialog still shows the old `group` snapshot (since `group` is selected/derived state, not re-derived from fresh query data)
3. User can't see the new order inside the dialog because items aren't displayed with `ordem_entrega`

## Plano: Feedback visível ao inverter ordem

### Problemas
1. Sem toast de sucesso/erro confirmando a inversão.
2. A lista de pedidos no diálogo não mostra o número da parada (`ordem_entrega`), então mesmo invertendo não há como visualizar a mudança.
3. O `group` selecionado pode não refletir os novos valores após o invalidate (depende de como `Consolidado.tsx` deriva o group aberto).

### Mudanças

**`src/pages/Consolidado.tsx`** — `inverterOrdemMut`:
- Adicionar `toast.success("Ordem de entrega invertida (N paradas)")` no `onSuccess`.
- Adicionar `toast.error(...)` no `onError`.
- Garantir que o `group` aberto seja re-derivado da query atualizada (re-selecionar pelo `cargaId` após invalidação) para que a lista no diálogo reflita a nova ordem.

**`src/components/dashboard/EditarCargaDialog.tsx`** — lista de pedidos:
- Mostrar o número da parada na frente de cada item: `#{ordem_entrega} Pedido X — Produto…` quando `ordem_entrega != null`.
- Ordenar `visibleItems` por `ordem_entrega` (asc, nulls ao fim) para que o usuário veja visualmente a sequência mudar de cabeça para baixo após inverter.

### Resultado
Após clicar "Inverter ordem":
- Toast verde "Ordem de entrega invertida (5 paradas)".
- A lista no diálogo reordena imediatamente (parada #1 vira #5, etc.), confirmando visualmente.
- Em caso de erro, toast vermelho com a mensagem.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/Consolidado.tsx` | Adicionar toasts e re-derivar `group` aberto após mutação |
| `src/components/dashboard/EditarCargaDialog.tsx` | Mostrar `#ordem_entrega` em cada item e ordenar lista por parada |
