

## Plano: Taxa de Ruptura por pedido único e exibição didática

### Problema atual
1. **Cálculo por linha**: `totalRupturas / totalPedidos` conta cada **linha de produto** individualmente. Se um pedido tem 5 produtos e 2 têm ruptura, conta como 2/5 em vez de 1 pedido afetado.
2. **Exibição seca**: O KPI mostra apenas "5%" sem contexto — não informa "5% de quê".

### O que será feito

**1. Alterar o cálculo para pedidos únicos (`useAnalytics.ts`)**
- `totalPedidosUnicos` = quantidade de `numero_pedido` distintos no período
- `pedidosComRuptura` = quantidade de `numero_pedido` distintos que têm pelo menos 1 linha com `ruptura = true`
- `taxaRuptura = (pedidosComRuptura / totalPedidosUnicos) * 100`
- Aplicar a mesma lógica no período anterior para a variação comparativa
- Exportar `pedidosComRuptura` e `totalPedidosUnicos` no objeto `kpis`

**2. Exibição didática no KPI Card (`Analytics.tsx`)**
- Em vez de mostrar apenas `5%`, mostrar: **`5%`** com subtítulo **`12 de 240 pedidos`**
- Adicionar campo `subtitle` ao KpiCard para suportar essa informação extra
- O KpiCard passa a renderizar uma linha menor abaixo do valor principal com o detalhe

**3. Tooltip no KPI do dashboard principal (`KpiCards.tsx`)**
- Atualizar o tooltip do card "Rupturas" para incluir a mesma lógica: calcular por pedido único e exibir "X de Y pedidos com ruptura"

### Arquivos a alterar
- `src/hooks/useAnalytics.ts` — cálculo por pedido único
- `src/pages/Analytics.tsx` — KpiCard com subtitle, exibição didática
- `src/components/dashboard/KpiCards.tsx` — tooltip e cálculo por pedido único

### Resultado esperado
O KPI de Taxa de Ruptura mostrará, por exemplo:
- **5%** (valor principal)
- **12 de 240 pedidos** (subtítulo explicativo)
- Tooltip: "Percentual de pedidos únicos que tiveram ao menos 1 produto com ruptura"

