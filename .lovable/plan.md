## Finalizar ciclo do Jairo (Varejo)

Jairo (placa HRS8C41) registrou saída em rota hoje (01/06) às 08:57 e não foi encontrado para fazer o retorno. Ele sumiu do Pátio Atual da aba Varejo, impedindo que a portaria registre o retorno pelo fluxo normal.

### O que será feito

- UPDATE no registro `a4b5b74c-a068-4681-bcaa-ed7ca83f8dcd` em `movimentacoes_portaria`:
  - `horario_real_retorno` → `now()`
  - `horario_saida_final` → `now()`
  - `etapa_carga_propria` → `'finalizado'`

Isso encerra o ciclo do Jairo para hoje, removendo o registro do Pátio Atual e marcando-o como concluído.

### Sem alterações de código

Apenas correção de dado operacional no banco. Nenhum arquivo do front é modificado.