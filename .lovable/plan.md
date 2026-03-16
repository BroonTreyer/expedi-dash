

# Corrigir logo Fricó na impressão do romaneio

## Problema
A regra CSS `#carga-print-root #carga-print-content * { color: black !important; }` não afeta imagens diretamente, mas o navegador pode estar ocultando a imagem na impressão. Além disso, não há regra garantindo que imagens sejam visíveis no print.

## Solução

### `src/index.css`
Adicionar regra explícita para garantir visibilidade de imagens no conteúdo de impressão:

```css
#carga-print-root #carga-print-content img {
  display: inline-block !important;
  visibility: visible !important;
  max-height: 48px !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
```

Isso força o navegador a renderizar a logo no PDF/impressão.

