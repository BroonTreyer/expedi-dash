## Problema

Na tela **Consolidado**, ao trocar a data da carga pelo calendário (ex.: clicar em 25/05), o toast "Data da carga atualizada" aparece, mas a célula continua mostrando **26/05/2026**.

### Causa

Na última iteração, a coluna **Data** passou a exibir `dataReal ?? g.data`, onde `dataReal` é derivado do `MAX(horario_fim)` dos itens (timestamp real do fim do carregamento). A edição de data, porém, só atualiza o campo `data` (data planejada) — `horario_fim` continua apontando para 26/05, então `dataReal` vence e a célula nunca muda.

## Plano

Ajustar `updateDateMut` em `src/pages/Consolidado.tsx` para que, ao alterar a data da carga, **também sejam deslocados** `horario_inicio` e `horario_fim` de todos os itens daquela `carga_id`, preservando o horário (hora/minuto/segundo) de cada registro.

### Passos

1. **`updateDateMut.mutationFn`** (`src/pages/Consolidado.tsx`, ~linha 384):
   - Buscar todos os itens da carga: `id, horario_inicio, horario_fim, data` via `select`.
   - Calcular o "shift" entre `data` antiga e `newDate` (em dias). Para cada item com `horario_inicio`/`horario_fim` não-nulos, recompor o timestamp mantendo a hora local e trocando a parte de data por `newDate` (mais robusto que somar dias, pois `data` pode variar entre itens em casos raros).
   - Atualizar em lote:
     - `update({ data: newDate })` para a carga inteira (como já é feito).
     - Para cada item com horários preenchidos, `update({ horario_inicio, horario_fim })` por `id` (Promise.all).
2. Manter o `onSuccess` atual (invalida `consolidado` e `carregamentos`, mostra toast).
3. Nenhuma mudança em UI, schema, RLS ou em outras telas. O Painel Logístico continua filtrando por `data` (planejada) normalmente; os horários reais passam a coincidir com a nova data exibida no Consolidado.

### Observação

Itens sem `horario_inicio`/`horario_fim` (cargas ainda não finalizadas) não recebem update de horário — só `data` é alterada. Isso preserva o estado de cargas em andamento.