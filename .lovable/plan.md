# Data do Carregamento visível e editável na página /pre-cargas

A alteração anterior ficou só dentro do diálogo "Fechar Carga" (no Dashboard). Na página **Pré-cargas** (onde o Faturamento normalmente vai trabalhar), a data hoje aparece como um badge pequeno (`formatDataBr`) e não pode ser alterada. Vamos torná-la grande e editável diretamente no card.

## Mudanças

Arquivo: `src/pages/PreCargas.tsx` (componente `PreCargaCard`, ~linha 328)

1. **Remover o badge atual** com a data ao lado do título.
2. **Adicionar uma faixa destacada** no topo do card, logo abaixo do `CardHeader`, com:
   - Ícone `CalendarDays` + label "Data do Carregamento".
   - Input `type="date"` com `h-10 text-base font-semibold` exibindo `carga.data`.
   - Texto auxiliar: "Pode ser alterada pelo Faturamento".
   - Se a data estiver no passado em relação a hoje, borda âmbar + aviso "Data já passou".

3. **Mutation de atualização**: criar `useAtualizarDataCarga` em `src/hooks/usePreCargas.ts` que faz `UPDATE carregamentos_dia SET data = $novaData WHERE carga_id = $cargaId` e invalida as queries `precargas`, `carregamentos` e `consolidated`. Debounce de 600ms no `onChange` + toast de confirmação ("Data atualizada para dd/MM/aaaa"). Em erro, reverte estado local e mostra toast destrutivo.

4. **Permissão**: liberar para roles `admin`, `faturamento`, `logistica` (mesmas que já fazem update em `carregamentos_dia` pela RLS existente). Esconder o input (mostrar texto read-only) para outras roles.

## Fora do escopo

- Não mexer no diálogo de fechamento (já está como combinado).
- Não alterar schema, migrations ou RLS — a policy "Ops update carregamentos_dia" já cobre esses três papéis.
- Não tocar em outras telas (Index/Dashboard, ConsolidatedView etc.) nesta rodada.
