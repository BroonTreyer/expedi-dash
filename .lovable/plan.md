## Mostrar produtos em ruptura sem precisar clicar

Hoje só dá pra ver os produtos em ruptura expandindo o pedido. Vamos exibi-los direto na linha, ficando óbvio o que está faltando.

### Mudança (apenas UI em `src/pages/PreCargas.tsx`)

Na `PedidoRow`, quando `pedido.qtdRupturas > 0`, renderizar logo abaixo do nome do cliente uma lista compacta dos itens em ruptura — sem precisar expandir.

Formato de cada item (badge/chip vermelho discreto):

```
⚠ <código> <nome do produto> — <peso> kg [· <motivo>]
```

- Filtra `pedido.itens.filter(temRuptura)`.
- Lista até 3 itens; se houver mais, mostra `+N` ao final.
- Estilo: `bg-destructive/10 text-destructive border-destructive/30 rounded px-1.5 py-0.5 text-[11px]`, com `AlertTriangle` 3x3.
- O clique na linha continua expandindo para ver todos os itens (inclusive os não-ruptura).
- Nada muda em hooks, dados, edição ou permissões.

### Resultado esperado no card do print

Abaixo de "CF DISTRIBUIDORA (CEARA FRANGOS) · Cód. 21405":

```
⚠ 1234 FILE DE PEITO — 1.200 kg · Sem estoque
⚠ 5678 COXA E SOBRECOXA — 1.500 kg
⚠ 9012 ASA — 912 kg
```

Fora do escopo: filtros novos, mudança de KPIs, alteração no dialog de edição.