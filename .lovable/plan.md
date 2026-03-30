

## Problema

No mobile (390px), o header do painel "Veículos Esperados" usa `flex items-center justify-between` com tudo em uma linha: ícone + título + 2 badges + botão "Limpar lista". Isso estoura horizontalmente — os badges e o botão ficam comprimidos ou cortados.

## Correção

No `CardHeader` (linhas 23-40), mudar o layout para empilhar no mobile:

1. Trocar o container de `flex items-center justify-between` para `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2`
2. O título com ícone fica na primeira linha
3. Os badges ficam em `flex flex-wrap gap-1` abaixo do título no mobile, ao lado no desktop
4. O botão "Limpar lista" fica na segunda linha no mobile, alinhado à direita

### Arquivo

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/VeiculosEsperadosPanel.tsx` | Reestruturar o CardHeader (linhas 23-40) para empilhar verticalmente no mobile com `flex-col sm:flex-row` e `flex-wrap` nos badges |

