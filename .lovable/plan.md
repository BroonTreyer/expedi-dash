## Problema
A carga **CF FRANGO** tem `data = 2026-05-15` e a entrada do Raimundo foi registrada em `2026-05-19`. A função `dentroJanela` em `useCargasFechadasAguardando` (src/hooks/useCarregamentos.ts) só aceita movimentos até **+48h** após a data da carga. Como o movimento está fora dessa janela, ele não é casado com a carga, então `entradaPorKey` fica vazia e o cartão azul não é ocultado — mesmo o veículo já estando no pátio.

## Plano
1. Em `useCargasFechadasAguardando`, ocultar a carga do painel azul sempre que existir uma movimentação **entrada com `horario_entrada` preenchido** e não finalizada para aquele `carga_id` (+ placa, quando disponível), **ignorando a janela de data**. A janela continua válida apenas para distinguir entre "aguardando liberação" e "carga sem chegada ainda".

2. Implementação prática: depois do loop atual, fazer uma segunda passada pelas movimentações que casam por `carga_id` + placa, e marcar a `key` como "no pátio" (adicionar a `finalizadaKey` para fins de filtro do painel, já que o objetivo é só sumir).

3. Não mexer no fluxo de "Liberar entrada no pátio" — ele já não é mais necessário no caminho novo, mas continua útil para movimentações antigas que ainda estão na fase chegada.

## Resultado esperado
Assim que a entrada do Raimundo é registrada (com `horario_entrada` preenchido), o cartão **CF FRANGO** desaparece do painel azul "Cargas fechadas aguardando veículo", independente da data planejada da carga.