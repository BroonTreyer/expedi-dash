Objetivo: no diálogo `Vincular carga ao motorista` (usado para vínculo de movimentações já registradas na portaria), a lista deve exibir apenas pré-cargas (`etapa = pre_carga`). Cargas já fechadas/logísticas não devem aparecer nesse diálogo.

Alterações propostas:
1. `src/hooks/useCarregamentos.ts`
   - Adicionar parâmetro opcional `somentePreCarga?: boolean` ao hook `useCargasFechadasParaVincular`.
   - Quando `somentePreCarga` for `true`, a consulta deve filtrar `etapa.eq('pre_carga')` em vez de `etapa.in(['logistica','pre_carga'])`.
   - O hook existente continua retornando ambos os estágios quando o parâmetro não for informado, preservando o comportamento do outro diálogo de vínculo.

2. `src/components/portaria/VincularMovimentoCargaDialog.tsx`
   - Passar `somentePreCarga: true` para `useCargasFechadasParaVincular`.
   - Ajustar título/descrição para referir-se a "pré-carga" em vez de "carga fechada".
   - Atualizar mensagem de estado vazio para orientar que não há pré-cargas disponíveis.

3. `src/components/portaria/VincularCargaDialog.tsx`
   - Não sofrer alterações; continua exibindo pré-cargas e cargas fechadas, conforme resposta do usuário.

A mutação `useVincularMovimentoACarga` já promove uma pré-carga para `logistica` ao vincular, então o fluxo de negócio permanece válido.