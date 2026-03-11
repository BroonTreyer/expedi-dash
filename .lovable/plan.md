

# Fix: Ruptura checkbox ignored on save

## Causa
In `src/pages/Rupturas.tsx` line ~97, the submit handler does:
```tsx
createMut.mutate({ ...values, ruptura: true, status: "Aguardando pedido" });
```
This spreads `ruptura: true` over every item, overwriting the per-item `item.ruptura` value that comes from the dialog.

## Correção — `src/pages/Rupturas.tsx`
Change the submit to only set `status: "Aguardando pedido"` and keep the item's own `ruptura` value:
```tsx
createMut.mutate({ ...values, status: "Aguardando pedido" });
```

The `defaultRuptura` prop already pre-checks all ruptura checkboxes in the dialog, so users start with all checked but can uncheck individual items. The per-item value from `item.ruptura` is already correctly passed through `values`.

## Arquivo (1)
- `src/pages/Rupturas.tsx`

