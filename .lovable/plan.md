

# Melhorar Dinamismo e Legibilidade dos Gráficos

## Mudanças

### 1. Tooltips ricos e consistentes
- Substituir o tooltip genérico por tooltips customizados com formatação visual: ícone de cor, valores formatados em negrito, labels claros
- Adicionar tooltip nos gráficos Pie/Donut com formatação rica

### 2. Animações nos gráficos
- Adicionar `animationDuration={800}` e `animationEasing="ease-out"` em todas as `<Area>`, `<Bar>`, `<Line>`, `<Pie>`
- Adicionar `activeDot` com tamanho maior e borda nos LineCharts para feedback visual ao hover

### 3. Melhorar legibilidade dos eixos
- Formatar eixo Y com unidades claras (ex: "1.2t" em vez de números longos)
- Rotacionar labels do eixo X em 45° quando houver muitas datas para evitar sobreposição
- Aumentar padding e espaçamento dos eixos

### 4. Interatividade visual
- Adicionar `cursor` com estilo nos BarCharts (highlight ao hover na barra)
- Bars com `activeBar` prop para highlight na barra sob o mouse
- Pie com `activeShape` para expandir o segmento ao hover

### 5. Gradientes e cores melhoradas
- Adicionar gradientes mais visíveis nas áreas
- Barras horizontais com gradiente da esquerda para direita
- Donut de status com sombra interna e label centralizado (total no meio)

### 6. Responsividade dos gráficos
- Usar `tick={{ angle: -45, textAnchor: 'end' }}` quando período > 15 dias
- Reduzir `fontSize` e `dot` size em telas menores

### 7. Heatmap melhorado
- Adicionar tooltip ao hover de cada célula (em vez de apenas `title`)
- Melhorar escala de cores (verde → amarelo → vermelho)
- Adicionar legenda de intensidade

---

## Detalhes Técnicos

| Arquivo | Mudança |
|---|---|
| `src/pages/Analytics.tsx` | Reescrever `ChartTooltip` com layout rico; adicionar animações, `activeDot`, `activeBar`, `activeShape` em Pie; melhorar heatmap com tooltip e escala de cores; labels dinâmicos nos eixos; donut com label central |

Nenhuma mudança no hook ou banco — apenas visual/UX.

