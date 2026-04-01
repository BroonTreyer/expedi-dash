

# Paleta de Cores Clean e Sólida para Analytics

## Problema

Todos os gráficos usam variações do mesmo vermelho (#D42027) com diferentes opacidades — no gráfico empilhado (Tipo de Veículo), as barras ficam todas em tons de rosa/vermelho, impossibilitando a distinção entre categorias.

## Solução

Substituir a paleta monocromática por cores **sólidas e bem distintas**, mantendo um visual profissional e clean:

```text
Vermelho Fricó  #D42027  — cor primária (destaque, KPIs)
Azul Marinho    #1E40AF  — 1ª categoria
Esmeralda       #059669  — 2ª categoria  
Âmbar           #D97706  — 3ª categoria
Slate           #64748B  — 4ª categoria
Violeta         #7C3AED  — 5ª categoria
Cyan            #0891B2  — 6ª categoria
```

## Mudanças em `src/pages/Analytics.tsx`

1. **Trocar `CHART_MONO`** pela nova paleta com cores sólidas e contrastantes
2. **Remover gradientes** dos gráficos de barras empilhadas — usar fills sólidos
3. **Manter gradiente** apenas no gráfico de área (Acumulado) onde faz sentido visual
4. **Barras horizontais** (ranking vendedores, UF, rupturas): usar azul marinho sólido em vez de gradiente vermelho
5. **Heatmap**: manter escala verde→amarelo→vermelho (já é legível)
6. **Legendas**: cores sólidas facilmente distinguíveis

Resultado: cada categoria no gráfico empilhado terá uma cor completamente diferente, sem ambiguidade.

