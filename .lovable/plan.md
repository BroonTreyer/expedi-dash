

# Corrigir logo Frico não aparecendo na impressão do Consolidado e Rupturas

## Problema
As regras CSS de impressão em `index.css` só aplicam estilos de visibilidade de imagem para `#carga-print-content img`. Porém o Consolidado usa `id="consolidado-print-content"` e o Rupturas usa `id="rupturas-print-content"`, então a regra CSS que força a exibição da imagem **não se aplica** a esses dois dialogs — a logo fica invisível na impressão.

## Solução
Atualizar o seletor CSS em `src/index.css` para cobrir todos os IDs de conteúdo de impressão. Trocar os 3 seletores específicos (`#carga-print-content`) por um seletor que funcione para qualquer conteúdo dentro do `#carga-print-root`:

- `#carga-print-root #carga-print-content` → `#carga-print-root [id$="-print-content"]`
- Ou mais simples: aplicar os estilos diretamente aos filhos de `#carga-print-root`

### Arquivo editado
- `src/index.css` — generalizar seletores CSS de impressão para cobrir consolidado, rupturas e carga

