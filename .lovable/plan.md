

# Auditoria de Cores do Analytics — Correções

## Problemas Encontrados

### 1. Progress bars nos Status Cards são VERMELHAS (bg-primary = #D42027)
O `<Progress>` usa `bg-primary` que é vermelho Fricó. O card "Carregado" (88%) tem barra vermelha — deveria ser **verde**. "Aguardando" deveria ser **âmbar**. "Pendente/Problema" vermelho até faz sentido, mas todos iguais confunde.

### 2. Progress bars na tabela de Tipo de Veículo são vermelhas
As mini barras inline na tabela "Resumo por Tipo de Veículo" usam `bg-primary/60` — vermelho. Deveriam ser uma cor neutra (navy ou slate) para não parecer alerta.

### 3. Ranking de UF (aba Geografia) usa barras vermelhas com opacidade
As barras de progresso do ranking UF usam `backgroundColor: BRAND_RED` com opacidade decrescente. Ficam todas vermelhas — deveria usar navy ou slate.

### 4. Barras de "Produtos com Mais Rupturas" são vermelho intenso demais
O gráfico de barras horizontais de rupturas usa `BRAND_RED` puro — é visualmente agressivo. Usar um tom mais suave (ex: `#E57373` ou `#EF5350`).

### 5. Gráfico de linha de ruptura — cor da linha Taxa % é vermelho intenso
Os dots vermelhos no gráfico de taxa diária são ok, mas o contraste com o fundo branco é forte demais.

### 6. VarBadge "↗ 100%" — verde demais para variações positivas
Os badges de variação `bg-emerald-50` com `text-emerald-700` estão ok, mas poderiam ser mais sutis.

## Correções Propostas

### `src/pages/Analytics.tsx`

1. **StatusMiniCards** — Usar cores semânticas nas progress bars:
   - Carregado → `bg-emerald-500`
   - Aguardando → `bg-amber-500`
   - Carregando → `bg-blue-500`
   - Outros → `bg-slate-400`

2. **PremiumTableRow** — Trocar `bg-primary/60` por `bg-slate-400/60` nas mini barras inline

3. **Ranking UF** — Trocar `BRAND_RED` por `NAVY` nas barras de progresso

4. **Produtos Rupturas** — Usar `#EF5350` (vermelho mais suave) em vez de `BRAND_RED` puro

5. **Ranking Vendedores** — Já usa NAVY, está ok — manter

### `src/components/ui/progress.tsx` (opcional)
Não alterar — as barras nos Status Cards serão customizadas inline via style no próprio Analytics.

## Resumo Visual

```text
Antes:  Tudo vermelho (#D42027) → confuso, parece alerta
Depois: Verde (carregado), Âmbar (aguardando), Azul (carregando), Slate (tabelas), Vermelho suave (rupturas)
```

## Detalhes Técnicos

| Arquivo | Mudança |
|---|---|
| `src/pages/Analytics.tsx` | StatusMiniCards: progress bars com cor semântica; PremiumTableRow: barras slate; UF ranking: barras navy; Produto rupturas: vermelho suave |

