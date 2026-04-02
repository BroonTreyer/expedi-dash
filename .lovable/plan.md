

# Corrigir edição de peso sendo sobrescrita pelo cálculo automático

## Problema Raiz

Quando o usuário abre o dialog de edição e altera o peso manualmente, ao clicar em salvar o sistema **recalcula o peso** automaticamente usando a fórmula `peso_padrao × quantidade` (linhas 196-200 do `CarregamentoDialog.tsx`), sobrescrevendo o valor que foi digitado manualmente.

```typescript
// Código problemático — sempre recalcula:
const finalItems = items.map(item => {
  const p = produtos.find(...);
  const pp = p?.peso_padrao ?? item.pesoPadrao;
  return { ...item, peso: pp > 0 ? pp * item.quantidade : item.peso };
});
```

O peso manual só é preservado quando `peso_padrao` é 0, o que quase nunca é o caso.

## Solução

### `src/components/dashboard/CarregamentoDialog.tsx`

1. Adicionar um flag `pesoManual` no `ProductItem` para rastrear se o usuário editou o peso manualmente
2. No `onChange` do campo peso, marcar `pesoManual = true`
3. No `handleItemQuantidade`, só recalcular peso se `pesoManual` for `false`
4. No `handleSubmit`, respeitar o flag: se `pesoManual` é true, usar `item.peso` direto em vez de recalcular

Mudanças específicas:

- Interface `ProductItem`: adicionar `pesoManual: boolean` (default `false`)
- `updateItem` para campo peso (linha 379): setar `pesoManual: true`
- `handleItemQuantidade` (linha 172-175): só recalcular se `!item.pesoManual`
- `handleSubmit` (linhas 196-200): usar `item.peso` quando `item.pesoManual === true`
- Quando `editing` preenche o item (linhas 77-85): manter `pesoManual: false` para que o recálculo funcione ao mudar quantidade

| Arquivo | Mudança |
|---|---|
| `CarregamentoDialog.tsx` | Adicionar flag `pesoManual` para preservar edições manuais de peso |

