

# Badge de ruptura não aparece nas child rows da página Rupturas

## Causa
Na `CarregamentoTable.tsx` (linha 449), o badge de ruptura individual nas child rows está dentro de `{!hideColumns.includes("etapa") && ...}`. Como a página Rupturas passa `hideColumns={["etapa", "qtd", "peso"]}`, a coluna "etapa" é ocultada e o badge de ruptura vai junto.

## Correção — `src/components/dashboard/CarregamentoTable.tsx`
Mover o badge de ruptura para fora do bloco condicional de "etapa", renderizando-o independentemente. O badge deve aparecer mesmo quando a coluna de etapa está oculta — basta colocá-lo em sua própria `TableCell` ou em outra célula visível (como a do código/produto).

Mesma verificação para linhas de item único (linhas 151-157): garantir que o badge não depende da visibilidade da coluna "etapa".

## Arquivos (1)
- `src/components/dashboard/CarregamentoTable.tsx`

