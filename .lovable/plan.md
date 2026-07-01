## Problema

A pré-carga "CEARA MIX" (`PRE-20260701-082352-93B`, etapa `pre_carga`, sem placa/transportadora) não aparece no diálogo "Vincular carga ao motorista" quando a Portaria tenta ligar o motorista José Reges (Alvorada Transportes, chegada terceirizada) a ela.

**Causa raiz** — em `useCargasFechadasParaVincular` (`src/hooks/useCarregamentos.ts`):
1. Query filtra `etapa = 'logistica'` → pré-cargas (`etapa = 'pre_carga'`) são excluídas.
2. `VincularMovimentoCargaDialog` / `VincularCargaDialog` ainda filtram por `transportadora` preenchida — pré-carga não tem transportadora, então mesmo relaxando a query o item some.

## Correção

1. **`src/hooks/useCarregamentos.ts` — `useCargasFechadasParaVincular`**
   - Trocar filtro por `.in("etapa", ["logistica", "pre_carga"])`.
   - Retornar um campo extra `is_pre_carga` no `CargaFechadaAguardando` para o dialog exibir badge.

2. **`src/components/portaria/VincularMovimentoCargaDialog.tsx` e `VincularCargaDialog.tsx`**
   - Remover o filtro `c.transportadora && c.transportadora.trim() !== ""` (pré-cargas nunca teriam).
   - Manter apenas o filtro de busca por texto.
   - Adicionar badge "Pré-carga" quando `is_pre_carga`.

3. **`useVincularMovimentoACarga` e `useVincularWalkInACarga`**
   - Ao atualizar `carregamentos_dia` da carga vinculada, se as linhas ainda estiverem em `etapa='pre_carga'`, promover para `etapa='logistica'` na mesma UPDATE, além de setar `placa`, `motorista` e `transportadora` (usando a `empresa` do movimento / dados do veículo esperado). Isso efetivamente "fecha" a pré-carga no ato do vínculo, para que apareça em Consolidados/Expedição normalmente.
   - Manter o `carga_id` original (`PRE-...`) para não quebrar histórico; auditoria já registra a mudança de etapa.

## Resultado esperado

Ao clicar "Vincular carga" no card do José Reges, a pré-carga "CEARA MIX" aparece na lista (com badge "Pré-carga"). Após confirmar, ela vira carga fechada de logística já com placa/motorista/transportadora do movimento e segue o fluxo normal de saída.
