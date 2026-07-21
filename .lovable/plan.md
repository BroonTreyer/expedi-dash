## Objetivo
Desfazer a quitação indevida do adiantamento que foi marcado como quitado sem pagamento real, para que o saldo volte a aparecer como pendente de quitação.

## O que já foi conferido
- A tabela de adiantamentos usa os campos `status`, `valor_saldo`, `pago_em`, `quitado_em`, `quitado_por` e `comprovante_quitacao_url`.
- O registro citado anteriormente, `ADT-20260708-001`, não apareceu entre os 30 registros mais recentes da transportadora MOREIRA, então antes de alterar preciso localizar exatamente o registro quitado indevidamente por número, transportadora/data ou evidência do histórico.

## Plano de ajuste
1. Localizar o(s) adiantamento(s) quitado(s) indevidamente, filtrando por MOREIRA e pela data de quitação 08/07/2026, incluindo registros mais antigos.
2. Confirmar quais registros têm `status = 'quitado'` e ainda possuem `valor_saldo` a receber.
3. Reverter apenas os registros identificados:
   - `status`: voltar para `pago`;
   - `quitado_em`: limpar;
   - `quitado_por`: limpar;
   - `comprovante_quitacao_url`: limpar, se houver;
   - manter `pago_em` e o comprovante do adiantamento, pois o adiantamento em si foi pago.
4. Validar no banco que o saldo voltou a ficar aberto e que o registro não aparece mais como quitado.

## Resultado esperado
O adiantamento continua como pago, mas com o saldo pendente para quitação, permitindo que o financeiro quite corretamente depois.