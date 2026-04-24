

## Remover coluna "Pedidos" da tabela do Consolidado

### Diagnóstico

Hoje a tabela desktop em `/consolidado` tem uma coluna **"Pedidos"** (header linha 759, célula linha 846) que mostra `g.qtdPedidos`. O usuário quer remover essa coluna da tabela.

### Mudança — `src/pages/Consolidado.tsx`

a) **Header** (linha 759): remover a linha
```tsx
<SortableTableHead sort={sort} sortKey="qtdPedidos" ... className="text-center">Pedidos</SortableTableHead>
```

b) **Célula** (linha 846): remover
```tsx
<TableCell className="text-center text-xs">{g.qtdPedidos}</TableCell>
```

c) **`colSpan` da linha expandida** de detalhes da carga: ajustar de `N` para `N-1` para alinhar visualmente após remover uma coluna. Vou conferir o valor atual no arquivo e decrementar em 1.

### Preservado (fora do escopo)

- **Card mobile** (linha 707) continua mostrando `Pedidos: N` — cards são compactos e essa info ainda é útil ali.
- **Romaneio impresso** (linhas 412, 514, 520) continua exportando `qtdPedidos`/`totalPedidos` — não mexo no PDF.
- **`sortAccessors.qtdPedidos`** (linha 454): pode ficar (não causa nada se não há header chamando), mas vou removê-lo também por limpeza.
- **Variável `totalPedidos`** (linha 476) e `g.qtdPedidos` no agrupamento: mantidos, ainda usados pelo romaneio.

### Resultado

A tabela desktop fica mais enxuta — sem a coluna "Pedidos". Mobile e romaneio impresso permanecem com a informação preservada.

