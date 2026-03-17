

# Por que alterações na tela não refletem na impressão — e como corrigir

## Causa raiz

O bloco `@media print` em `src/index.css` (linhas 141-144) aplica regras com `!important` a **todos** os elementos dentro do conteúdo de impressão:

```css
#carga-print-root [id$="-print-content"] * {
  color: black !important;
  border-color: #ccc !important;
}
```

E na linha 137:
```css
font-size: 11pt !important;
```

Essas regras globais com `!important` **sobrescrevem** qualquer estilo inline ou classe Tailwind que os componentes aplicam. Por isso, ao mudar `text-[13px]` no `StatusBadge`, a mudança aparece na tela mas não na impressão.

## Solução

Remover o `font-size: 11pt !important` global do container e deixar os componentes controlarem seus próprios tamanhos. Manter apenas as regras essenciais para impressão (cores e layout).

### Arquivo: `src/index.css`

1. **Remover** `font-size: 11pt !important` da regra do container (linha 137) — deixar os componentes definirem seu próprio tamanho
2. **Mover** `font-size` para uma regra base no `body.printing-carga` como fallback (sem `!important`), permitindo que classes específicas dos componentes tenham prioridade
3. **Remover** `color: black !important` do seletor `*` (wildcard) e aplicar `color: black` apenas no `body` — assim badges coloridos e outros elementos mantêm seus estilos

```css
/* Container - sem forçar font-size */
#carga-print-root [id$="-print-content"] {
  width: 100% !important;
  padding: 0 !important;
  color: black;
  line-height: 1.4;
}

/* Remover o wildcard que mata todos os estilos */
/* Antes: #carga-print-root [id$="-print-content"] * { color: black !important } */
/* Depois: apenas border-color para manter separadores visíveis */
#carga-print-root [id$="-print-content"] * {
  border-color: #ccc !important;
}
```

Isso faz com que **qualquer alteração de fonte, cor ou estilo nos componentes passe direto para a impressão**.

