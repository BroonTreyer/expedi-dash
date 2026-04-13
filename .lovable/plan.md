

# Clonar pedido inteiro (todos os itens)

## Problema
Atualmente o clone copia apenas a linha clicada. Um pedido pode ter múltiplos produtos (mesmo `numero_pedido` + `data`), e o usuário quer clonar todos.

## Solução

### `src/pages/Index.tsx` — `handleClone`
Em vez de clonar só o registro clicado, buscar todos os "irmãos" do mesmo pedido na lista `carregamentos` já carregada (filtrar por `numero_pedido` + `data`), e passar todos como items para o dialog.

Mudanças:
- `handleClone` filtra `carregamentos` por `c.numero_pedido === clicked.numero_pedido && c.data === clicked.data`
- Passa os irmãos como uma nova prop `cloneItems` para `CarregamentoDialog`
- Limpa `id` e `numero_pedido` do editing principal

### `src/components/dashboard/CarregamentoDialog.tsx`
- Adicionar prop opcional `cloneItems: Carregamento[]`
- No `useEffect` de inicialização (quando `editing` existe), se `cloneItems` tiver mais de 1 item, popular `items[]` com todos os produtos do pedido (não apenas o primeiro)
- O resto do fluxo (submit batch) já funciona para múltiplos items

2 arquivos, ~15 linhas alteradas.

