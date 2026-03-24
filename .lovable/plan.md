

# Plano: Roteirização Automática com Origem em Goiânia + Coluna Nome da Carga no Consolidado

## Problema 1 — Roteirização manual
Atualmente, ao abrir o dialog de roteirização, os destinos ficam na ordem em que os pedidos foram selecionados. O usuário precisa clicar "Roteirizar" manualmente. O sistema deveria automaticamente otimizar a rota com base na saída de Goiânia-GO.

## Problema 2 — Nome da carga ausente no Consolidado
A coluna `nome_carga` existe no banco mas não é exibida na página de Consolidado.

---

## Mudanças

### 1. `src/components/dashboard/RoteirizacaoDialog.tsx`
- Ao abrir o dialog (no `useEffect` que monta os groups), chamar automaticamente a edge function `roteirizar` passando `origemCidade: "Goiânia"` e `origemUf: "GO"`
- Remover a necessidade de clicar "Roteirizar" para a primeira vez — a otimização roda ao abrir
- O botão "Roteirizar" continua disponível para recalcular caso o usuário reordene ou exclua destinos manualmente

### 2. `supabase/functions/roteirizar/index.ts`
- Usar os parâmetros `origemCidade` e `origemUf` (já recebidos mas não utilizados) como primeiro ponto da rota
- Geocodificar Goiânia-GO como ponto de origem
- Incluir a origem como primeiro waypoint no OSRM (`source=first`) para que a rota comece de lá
- Não incluir a origem na lista de destinos retornada (apenas como referência de partida)

### 3. `src/pages/Consolidado.tsx`
- Adicionar `nomeCarga` ao `CargaGroup` (pegar de `item.nome_carga` do primeiro item)
- Adicionar coluna "Carga" na tabela desktop (com `SortableTableHead`)
- Exibir `nome_carga` também nos cards mobile
- Adicionar accessor no sort: `nomeCarga: (g) => g.nomeCarga ?? ""`

---

## Sem alterações no banco de dados
A coluna `nome_carga` já existe na tabela `carregamentos_dia`.

