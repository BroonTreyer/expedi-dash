
# Redesign Completo do Analytics — Visual Elegante e Profissional

## Problemas Identificados

1. **Filtros (chips)** — Ocupam 3 linhas inteiras no topo, visual de "tags soltas" sem hierarquia, poluem a tela antes mesmo dos dados
2. **Treemap de Vendedores** — Cores vibrantes demais (azul/vermelho/verde/roxo), blocos retangulares brutos, textos cortados, visual de infográfico amador
3. **Gráficos em geral** — Cards sem respiração visual, títulos sem contexto, falta de subtítulos e unidades claras
4. **KPI cards** — Funcionais mas sem diferenciação visual entre eles, todos iguais
5. **Donut de Status** — Muito grande para pouca informação, espaço desperdiçado

## Redesign Proposto

### 1. Filtros: de chips para dropdown compacto
- Substituir as 3 linhas de badges por um botão "Filtros" com popover/dropdown
- Dentro do popover: 3 seções (Vendedor, Tipo, UF) com checkboxes
- Badge de contagem ao lado do botão quando há filtros ativos (ex: "Filtros (3)")
- Libera ~80px de espaço vertical

### 2. Treemap → Gráfico de barras horizontal com progress bars
- Remover o Treemap completamente
- Substituir por um ranking visual elegante: lista de vendedores com barra de progresso proporcional ao peso, estilo dashboard moderno
- Cor única (primary/brand) com opacidade variável por posição
- Cada item mostra: nome, peso formatado, % de participação
- Visual limpo, fácil de ler, sem cores gritantes

### 3. Paleta de cores refinada
- Trocar as 10 cores HSL vibrantes por uma paleta monocromática baseada no vermelho Fricó (#D42027) com variações de opacidade e tonalidade
- Cores secundárias em tons de slate/zinc para dados complementares
- Gradientes suaves em vez de cores sólidas nos gráficos de barras

### 4. Cards com mais contexto
- Adicionar subtítulos nos cards de gráfico (ex: "Evolução do peso total expedido no período")
- Bordas mais sutis, sombras mais leves
- Separar melhor os blocos com espaçamento consistente

### 5. Donut de Status → Mini cards de status
- Substituir o donut (que ocupa metade da tela para 2-3 status) por 3 mini cards horizontais com ícone, contagem e barra de progresso
- Mais informativo em menos espaço

### 6. Tabelas com visual premium
- Adicionar barras de progresso inline nas colunas de peso
- Zebra striping sutil
- Hover mais elegante

---

## Detalhes Técnicos

| Arquivo | Mudanças |
|---|---|
| `src/pages/Analytics.tsx` | Reescrever: filtros como Popover, remover Treemap, criar componente de ranking com progress bars, substituir donut por mini status cards, paleta monocromática, subtítulos nos gráficos, tabelas com barras inline |

Apenas mudanças visuais — nenhuma alteração no hook ou banco de dados.
