## Problema

A carga **CG-20260728-183406-31A** (ASSAI MT, placa OZR0D10, AIRTON CARLOS) aparece como **Expedido** no Consolidado, mas o veículo nunca entrou de fato no pátio.

Diagnóstico no banco:
- `movimentacoes_portaria` id `a06334bc-b59d-49bd-ad34-f9de5762ecfb`: `etapa_terceirizado='finalizado'`, `horario_chegada=2026-07-21 22:53`, **`horario_entrada=NULL`** (nunca liberou entrada), `horario_saida_final=2026-07-22 16:40`. Ou seja, foi "finalizado" sem passar pelo pátio — é isso que está pintando o status "Expedido".
- `veiculos_esperados` id `18cb48e6-...` (grupo TERCEIRIZADO, data 2026-07-28, `conferido=false`, `status_autorizacao='previsto'`) — já está no estado correto de "esperado".
- `carregamentos_dia` (17 linhas do carga_id): algumas com `status='Pronto para carregar'`, outras `'Aguardando'`, todas em `etapa='logistica'`.

## O que fazer

1. **Apagar a movimentação fantasma** `a06334bc-...` de `movimentacoes_portaria` (não teve entrada real; o registro inteiro é lixo).
2. **Uniformizar `carregamentos_dia`** do `carga_id CG-20260728-183406-31A`: voltar todas as linhas para `status='Aguardando'` (assim o Consolidado volta a mostrar "Aguardando" e some o selo Expedido).
3. Manter o `veiculos_esperados` como está (já é "previsto"/não conferido) — a carga volta a aparecer no painel de A chegar / esperados.

Sem mudança de schema, sem código. Só operação pontual via SQL no banco.

## Impacto

- Consolidado do 22/07: linha some do "Expedido" e volta como aguardando.
- Painel Expedição: carga entra em "A chegar" (tem `veiculos_esperados` previsto para 28/07).
- Portaria: não há mais movimento aberto para essa placa/carga; ao chegar de novo, registra chegada normalmente.
