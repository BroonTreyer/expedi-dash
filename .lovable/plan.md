## Objetivo

No diálogo de Fechar Carga (Roteirização) → botão "Exportar", a coluna **PESO** está usando o peso efetivo (já descontados itens em ruptura). O usuário quer o **peso total planejado**, sem o corte da ruptura.

## Mudança

Arquivo: `src/components/dashboard/RoteirizacaoDialog.tsx` — função `handleExportExcel` (linhas ~525-565).

Trocar `g.pesoTotal` (peso efetivo) por `g.pesoPlanejado` (peso original, inclui itens em ruptura) tanto na linha do cliente quanto no total da última linha:

- Linha 538: `totalPesoExcel += g.pesoPlanejado;`
- Linha 545: `g.pesoPlanejado,`

Nada mais muda — a UI do diálogo continua mostrando `pesoTotal` (efetivo) normalmente; só o Excel exportado passa a refletir o peso planejado completo.