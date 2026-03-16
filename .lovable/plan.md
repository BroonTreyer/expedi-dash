

# Ordem de entrega por Cliente (agrupado)

## Problema
Atualmente cada **pedido/produto** tem sua própria ordem de entrega. O correto é a ordem ser por **cliente** — um cliente pode ter vários produtos, mas a entrega é uma só parada.

## Solução

### `src/components/dashboard/FechamentoLoteDialog.tsx`

Agrupar os itens por `codigo_cliente` antes de exibir a lista de ordem:

1. **Agrupar itens por cliente**: criar estrutura `ClienteGroup { codigoCliente, nomeCliente, items: OrderedItem[], pesoTotal, ordem }`.
2. **Lista de ordem mostra clientes**, não produtos. Cada card de cliente mostra o nome e lista os produtos/pesos abaixo como sub-itens.
3. **Setas e campo numérico** movem o grupo inteiro (cliente).
4. **No submit**: todos os pedidos de um mesmo cliente recebem a mesma `ordem_entrega` do grupo.

Exemplo visual:
```text
[1]  CLI001 – Supermercado João     ↑↓
       Produto A · 500 kg
       Produto B · 300 kg
       Total: 800 kg

[2]  CLI002 – Mercearia Maria       ↑↓
       Produto C · 200 kg
       Total: 200 kg
```

### Arquivos editados
- `src/components/dashboard/FechamentoLoteDialog.tsx` — agrupar por cliente, reordenar grupos

Nenhuma mudança no banco ou em outros arquivos.

