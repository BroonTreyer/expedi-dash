

# Corrigir Layout de Impressão do Romaneio

## Problemas atuais

O `@media print` atual usa `visibility: hidden` em tudo e depois torna visível o `#carga-print-content`. Isso causa:
1. O Radix Dialog overlay/backdrop interfere no layout (posicionamento `fixed`, z-index, transform do DialogContent)
2. O conteúdo fica preso dentro do DialogContent que tem `translate(-50%, -50%)` e `fixed` positioning
3. Margens, padding e dimensões ficam inconsistentes
4. O close button do dialog (X do Radix) aparece no print

## Solução

Reescrever as regras `@media print` no `src/index.css` para:
- Resetar completamente o posicionamento do portal, overlay e dialog content
- Remover transforms, fixed positioning, z-index, max-width/max-height do dialog
- Garantir que o conteúdo flua naturalmente como um documento A4
- Esconder elementos não-printáveis (sidebar, header, botões)
- Configurar margens e tamanho de página adequados

### `src/index.css` — reescrever bloco `@media print`

```css
@media print {
  @page {
    size: A4 portrait;
    margin: 15mm;
  }

  /* Reset everything */
  body {
    background: white !important;
    color: black !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Hide all page content */
  body > *:not([data-radix-portal]) {
    display: none !important;
  }

  /* Reset Radix portal/overlay/dialog positioning */
  [data-radix-portal] {
    position: static !important;
    display: block !important;
  }

  [data-radix-portal] > [role="dialog"],
  [data-radix-portal] > div {
    position: static !important;
    transform: none !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    max-width: none !important;
    max-height: none !important;
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
    padding: 0 !important;
    margin: 0 !important;
    inset: auto !important;
    z-index: auto !important;
    animation: none !important;
    opacity: 1 !important;
  }

  /* Hide overlay backdrop */
  [data-radix-portal] > [data-state] {
    display: none !important;
  }
  [data-radix-portal] > [role="dialog"] {
    display: block !important;
  }

  /* Hide screen-only elements */
  .print\\:hidden,
  [data-radix-portal] button[class*="absolute"] {
    display: none !important;
  }

  /* Print content styles */
  #carga-print-content {
    width: 100% !important;
    padding: 0 !important;
    color: black !important;
    font-size: 11pt !important;
    line-height: 1.4 !important;
  }

  #carga-print-content * {
    color: black !important;
    border-color: #ccc !important;
  }
}
```

### `src/components/dashboard/CargaPrintDialog.tsx` — limpar classes print inline

Simplificar as classes do DialogContent e conteúdo interno, removendo classes `print:` inline redundantes já que o CSS global cuidará de tudo.

## Arquivos editados
- `src/index.css` — reescrever regras `@media print`
- `src/components/dashboard/CargaPrintDialog.tsx` — limpar classes inline de print

