Vou corrigir a fonte do card vermelho dessa tela (`/portaria/registro-entrada`).

Problema encontrado:
- O registro atual do Fagno existe em `movimentacoes_portaria` como terceirizado em `chegada`, sem `carga_id` e sem `horario_entrada`.
- Mas o card vermelho da tela do print não lê essa tabela; ele lê apenas `veiculos_esperados` com `walk_in=true`, `conferido=false` e `status_autorizacao='aguardando_vinculo'`.
- Como o Fagno não tem um `veiculos_esperados` ativo equivalente, ele aparece no Pátio Atual, mas não entra nesse card vermelho de “Aguardando vínculo da Logística”.

Plano de correção:
1. Ajustar `SolicitacoesPendentesPanel` para também buscar movimentos ativos em `movimentacoes_portaria` que estejam como:
   - `categoria='terceirizado'`
   - `etapa_terceirizado='chegada'`
   - `carga_id` vazio
   - `horario_entrada` vazio
2. Unificar esses registros com os walk-ins de `veiculos_esperados`, evitando duplicidade quando houver os dois registros para a mesma placa.
3. No card vermelho, manter os mesmos dados visíveis: placa, motorista, transportadora, tipo do veículo e horário de chegada.
4. Para registros vindos de `movimentacoes_portaria` (caso do Fagno), trocar a ação “Vincular a carga” para usar o diálogo correto (`VincularMovimentoCargaDialog`), que atualiza o movimento existente.
5. Manter os registros antigos de `veiculos_esperados` usando o fluxo atual (`VincularCargaDialog`) sem alterar o comportamento dos cards que já aparecem no print.

Validação esperada:
- Fagno/QWE1B20 volta a aparecer no card vermelho “Aguardando vínculo da Logística”.
- PBV1F92 e TMQ7C81 continuam aparecendo como estão.
- Ao vincular uma carga no Fagno, ele sai do vermelho e segue o fluxo normal de liberação/entrada no pátio.