# Wagner (NFP7I55) aparece como "Expedido" sem ter saído

## O que aconteceu

Confirmado no banco:

1. Em 04/08 o Wagner chegou como walk-in e essa solicitação foi **recusada**. A recusa finaliza a movimentação (regra atual), então aquele registro antigo ficou com etapa `finalizado` e saída em 05/08 12:10.
2. Em 05/08 13:38 a logística vinculou a placa NFP7I55 à carga nova `CG-20260805-103840-U9P` (MATEUS SLZ CARRO 1 / OC 132304).
3. O gatilho que liga movimentações à carga procura qualquer entrada da mesma placa dos últimos 7 dias sem carga — e pegou justamente aquele registro **já finalizado** de 04/08. Resultado: a carga nova nasceu marcada como "Expedido".
4. A chegada real de hoje (05/08 13:55) existe e está solta, sem carga vinculada.

## Correção

**1. Corrigir o gatilho de vínculo**
- Passar a ignorar movimentações já encerradas: só vincular entradas sem `horario_saida_final` e cuja etapa não seja `finalizado` (terceirizado ou frota própria).
- Reduzir a janela de busca de 7 dias para 24 horas, evitando capturar chegadas antigas de outra viagem.

**2. Acertar os dados do Wagner**
- Desvincular a movimentação finalizada de 04/08 da carga `CG-20260805-103840-U9P`.
- Vincular a chegada real de hoje (05/08 13:55) a essa carga, mantendo a etapa "chegada".
- Amarrar o walk-in de hoje à mesma carga para ele sair da fila de "aguardando vínculo" e voltar a aparecer como veículo no pátio/esperado, e não como expedido.

## Resultado esperado

A carga MATEUS SLZ CARRO 1 volta para "Aguardando" na portaria, com o Wagner listado como chegada de hoje, e cargas futuras não herdam mais movimentações antigas já finalizadas.
