## Corrigir KPIs do painel principal — escopo "Híbrido inteligente"

### Mudança em `src/pages/Index.tsx`

Criar `kpiSource` paralelo a `filtered`, que **ignora** o toggle "Mostrar Logística" e a ocultação de finalizados (`carga_id != null && status === "Carregado"`), mas **respeita** todos os filtros explícitos do usuário (status, vendedor, tipo caminhão, etapa selecionada manualmente, ruptura, cliente, UF, busca, dateRange).

Trocar a prop `data` do `<KpiCards>` de `filtered` para `kpiSource`. A prop `selectedData` (seleção manual) permanece com prioridade.

### Comportamento resultante

- **Tabela / Kanban**: inalterados — toggle e ocultação continuam funcionando.
- **KPIs**: passam a refletir TUDO do dia por padrão; quando o usuário aplica filtros, os cards atualizam junto.
- **Peso Total / Carregado / Veículos**: deixam de zerar quando todos os pedidos estão em etapa logística.

### Arquivos

- `src/pages/Index.tsx` — adicionar `kpiSource` (useMemo) + trocar prop do `KpiCards`.
