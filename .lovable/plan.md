

# Fix: Clonar pedido inteiro

## Problema identificado

Há dois bugs:

1. **Guard de inicialização bloqueia clones repetidos**: No `CarregamentoDialog`, linha 85, existe um guard `if (lastInitId.current === editing.id) return;`. Quando clonamos, `editing.id` é `""`. Após o primeiro clone, `lastInitId.current` fica `""`, e clones subsequentes são ignorados porque `"" === ""`.

2. **Possível falha no filtro de irmãos**: O `numero_pedido` pode ser `number | null`. Se a comparação falhar silenciosamente, só o item clicado é retornado.

## Solução

### `src/pages/Index.tsx` — `handleClone`
- Gerar um ID temporário único (ex: `crypto.randomUUID()`) para o `editing.id` do clone, garantindo que o guard `lastInitId` nunca bloqueie
- Manter o filtro de siblings por `numero_pedido` + `data`

### `src/components/dashboard/CarregamentoDialog.tsx`
- Ajustar a lógica do `useEffect` para que o guard funcione com IDs temporários de clone
- Garantir que no submit, IDs temporários (não-UUID do banco) sejam tratados como INSERT

2 arquivos, ~5 linhas alteradas.

