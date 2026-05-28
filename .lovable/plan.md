# Correções na edição de Pré-carga

Dois ajustes no fluxo "Editar pré-carga" (diálogo `FechamentoLoteDialog` em modo pré-carga).

## 1. A ordem reordenada não "volta" após salvar

**Causa:** o `ordem_entrega` JÁ é gravado no banco quando você arrasta e clica em "Atualizar pré-carga". O problema é que, ao reabrir o diálogo de edição, os itens são lidos sem usar `ordem_entrega` para ordenar — então a lista aparece de novo na ordem original e dá a impressão de que a reordenação não foi salva.

**Correção:**
- Em `src/pages/Index.tsx` (`preCargas`): ordenar `items` de cada `PreCargaGroup` por `ordem_entrega` (com `numero_pedido` como desempate).
- Em `src/components/dashboard/FechamentoLoteDialog.tsx` (`initialGroups`): quando os grupos são construídos a partir de `items` (caminho usado na edição de pré-carga, sem `roteirizacao`), ordenar pelo `ordem_entrega` mínimo do grupo antes de atribuir `ordem: idx + 1`.

Com isso, a ordem salva volta a aparecer corretamente toda vez que a pré-carga é reaberta para edição.

## 2. Falta o botão "Roteirizar" no diálogo de pré-carga

Hoje o "Roteirizar" só existe na barra de seleção de pedidos (`Index.tsx`, fluxo Fechar Carga). Dentro do diálogo de edição de pré-carga não há atalho equivalente, mesmo que o mapa já mostre a rota.

**Correção:** adicionar no header do diálogo `FechamentoLoteDialog` um botão "Roteirizar" (ícone `Route`) que:
- fica visível sempre que houver ≥2 destinos com cidade/UF (mesmo critério atual de roteirização);
- abre o `RoteirizacaoDialog` passando os `items` atuais do diálogo;
- quando o `RoteirizacaoDialog` confirma, aplica o resultado de volta no `FechamentoLoteDialog` (reordena `groups` segundo `roteirizacao.groups`, atualiza `routeGeometry`, `distanciaTotalLocal`, `trechosLocal`, `rotaRapida/Economica`, `modoRota`) — mesma lógica usada quando o resultado chega pela prop `roteirizacao`.

Implementação:
- Adicionar prop opcional `onRequestRoteirizar?: () => void` em `FechamentoLoteDialog`.
- Em `Index.tsx`, passar um handler que abre o `RoteirizacaoDialog` com os mesmos `items` do diálogo aberto (sem fechar o `FechamentoLoteDialog`) e, no `onAdvance` desse RoteirizacaoDialog, em vez de só abrir o lote dialog, também atualizar `roteirizacaoResult` — o `FechamentoLoteDialog` já reage a mudanças em `roteirizacao` via `useEffect` (linha ~189) e reidrata a rota/grupos.
- Manter `RoteirizacaoDialog` controlado pelo state existente (`roteirizacaoOpen`, `roteirizacaoResult`).

## Arquivos alterados

- `src/pages/Index.tsx` — ordenar `items` por `ordem_entrega`; passar `onRequestRoteirizar` ao `FechamentoLoteDialog`.
- `src/components/dashboard/FechamentoLoteDialog.tsx` — ordenar `initialGroups` por `ordem_entrega`; adicionar botão "Roteirizar" no header com a nova prop.

Nenhuma mudança de schema, RLS ou lógica de gravação.
