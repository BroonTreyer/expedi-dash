

# Analytics v3.0 — Upgrade Completo

## Visão Geral

Transformar a página de Analytics de 4 gráficos simples em um painel gerencial completo com tabs, métricas comparativas, novos gráficos e funcionalidades avançadas.

## Novas Funcionalidades

### 1. Layout com Tabs organizadas
- **Visão Geral** — KPIs com comparação vs período anterior + sparklines
- **Expedição** — Peso diário, acumulado, meta visual
- **Vendedores** — Ranking, comparativo, evolução individual
- **Rupturas** — Taxa, heatmap semanal, ranking de produtos com mais rupturas
- **Geografia** — Distribuição UF em treemap + tabela detalhada

### 2. KPIs com comparação percentual
Cada KPI mostra o valor atual e a variação (%) vs período anterior equivalente. Seta verde para crescimento, vermelha para queda. Calculado automaticamente no hook.

### 3. Novos gráficos e métricas

**Tab Visão Geral:**
- 6 KPIs com variação % e micro-sparklines
- Gráfico de peso acumulado (linha crescente)
- Status breakdown (donut: Aguardando / Carregando / Carregado)

**Tab Expedição:**
- Área chart peso diário (já existe, melhorado)
- Gráfico de barras empilhadas: peso por tipo de caminhão por dia
- Linha de peso acumulado no período
- Tabela resumo por dia (peso, pedidos, carregados, rupturas)

**Tab Vendedores:**
- Bar chart horizontal top 10 (já existe, melhorado com pedidos overlay)
- Treemap de participação por vendedor
- Tabela com colunas: vendedor, peso, pedidos, % participação, média por pedido

**Tab Rupturas:**
- Line chart taxa diária (já existe)
- Heatmap semanal (dia da semana vs semana) mostrando concentração
- Ranking de produtos com mais rupturas (bar chart)
- KPI: dias sem ruptura, pior dia, média semanal

**Tab Geografia:**
- Treemap por UF (mais visual que pie chart)
- Tabela detalhada: UF, peso, pedidos, % do total
- Bar chart horizontal UFs

### 4. Filtros avançados
- Período customizado com date range picker (além dos presets)
- Filtro por vendedor (select múltiplo)
- Filtro por tipo de caminhão
- Filtro por UF

### 5. Exportar dados
- Botão para exportar tabela visível como CSV

### 6. Visual premium
- Cards com gradientes sutis e ícones coloridos
- Animações de entrada nos gráficos
- Tooltips ricos em todos os gráficos
- Esquema de cores consistente e profissional
- Loading skeletons enquanto carrega
- Empty states quando não há dados

---

## Mudanças Técnicas

| Arquivo | Mudança |
|---|---|
| `src/hooks/useAnalytics.ts` | Adicionar: query de período anterior para comparação %, breakdown por status, por tipo caminhão, por produto (rupturas), peso acumulado, heatmap semanal, filtros de vendedor/tipo/uf |
| `src/pages/Analytics.tsx` | Reescrever com Tabs, novos gráficos, KPIs comparativos, filtros avançados, export CSV, skeletons, empty states |

Dados extras derivados dos mesmos campos já existentes na tabela `carregamentos_dia` — sem necessidade de migração de banco.

