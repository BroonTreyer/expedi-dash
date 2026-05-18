## Reorganizar os blocos do pedido em /pre-cargas

No print, a linha do pedido fica desbalanceada: a coluna **Cliente** expande com os chips de ruptura e empurra **Cidade / Peso / Ruptura / Editar** para a direita, deixando o nome dos produtos truncado no meio da palavra.

### Mudanças (somente UI em `src/pages/PreCargas.tsx`)

1. **Trocar a `<Table>` por uma grid responsiva por linha de pedido**, mantendo o mesmo cabeçalho. Cada linha vira um grid:
   ```
   grid-cols-[64px_minmax(0,1fr)_140px_110px_120px_88px]   // ≥ lg
   grid-cols-[56px_minmax(0,1fr)_110px_100px_96px]         // md (esconde Cidade, igual hoje)
   flex-col                                                 // sm (cards empilhados)
   ```
   Isso fixa as colunas numéricas à direita e o bloco do cliente nunca empurra o resto.

2. **Chips de ruptura em bloco próprio abaixo da linha do pedido**, ocupando largura total (`col-span-full`), não mais dentro da célula "Cliente":
   - Container: `mt-2 flex flex-wrap gap-1.5`
   - Chip: largura natural, `max-w-full`, nome do produto com `truncate` só quando passa de ~28ch — sem cortar no meio da palavra em telas largas.
   - Mantém até 3 chips + `+N`.

3. **Bloco de cabeçalho do card** (já existente, topo do card): no print já está OK, mas vou garantir que `Peso total / embarcados` use `text-right` com `ml-auto` e quebra controlada em telas < sm (vira linha abaixo do título em vez de competir com os badges).

4. **Mobile (< sm)**: cada pedido vira um mini-card com:
   ```
   #85 · CF DISTRIBUIDORA ...           [Editar]
   Santa Isabel/PA
   Peso: 26.960,6 kg   Ruptura: 3.612 kg
   [chips de ruptura, largura total]
   ```

5. **Nada muda** em hooks, dados, edição, KPIs, permissões ou no expand de "Itens do pedido".

### Resultado

- Colunas alinhadas e estáveis independente da quantidade de chips.
- Nome do produto não quebra mais no meio (`LING SUINA FINA APIMENTADA NT...` vira `LING SUINA FINA APIMENTADA NT 60` ou trunca limpo no fim).
- Em telas estreitas o pedido empilha em vez de gerar scroll horizontal.