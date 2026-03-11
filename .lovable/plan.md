

# Ruptura por item individual

## Problema
O checkbox "Ruptura de estoque" é único para o pedido inteiro. Quando há múltiplos produtos, o usuário não consegue marcar apenas um item como ruptura.

## Solução
Mover o campo `ruptura` para dentro de cada `ProductItem`, adicionando um checkbox individual por linha de produto.

### Mudanças — `src/components/dashboard/CarregamentoDialog.tsx`

1. **Adicionar `ruptura` ao tipo `ProductItem`** e ao `emptyItem()` (default `false`).

2. **No `useEffect` de edição**, carregar `ruptura` do `editing` para o item.

3. **Remover o checkbox global** de ruptura (o bloco com `form.ruptura`).

4. **Adicionar checkbox por item** na grid de cada produto, ao lado do botão de remover — um pequeno checkbox com tooltip ou label compacto "Ruptura".

5. **No `handleSubmit`**, enviar `ruptura` de cada item individualmente em vez de `basePayload.ruptura`:
```tsx
onSubmit({
  ...basePayload,
  codigo_produto: item.codigo_produto,
  nome_produto: item.nome_produto,
  quantidade: item.quantidade,
  peso: item.peso,
  ruptura: item.ruptura,
});
```

### Resultado visual
Cada linha de produto terá seu próprio checkbox de ruptura, permitindo marcar itens específicos como falta de estoque.

## Arquivos (1)
- `src/components/dashboard/CarregamentoDialog.tsx`

