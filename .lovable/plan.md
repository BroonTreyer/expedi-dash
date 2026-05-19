## Problema
Ao clicar em **Registrar chegada do veículo** para o Raimundo, o sistema cria uma chegada com `horario_chegada`, mas deixa `horario_entrada` vazio. Por isso ele continua fora da lista **Pátio** e depende de um segundo clique em **Liberar entrada no pátio** no painel azul.

No caso do Raimundo, há também um detalhe técnico: a carga **CF FRANGO** está com data planejada antiga (`15/05`), enquanto a chegada foi registrada hoje. A regra atual do painel azul só casa movimentações até 48h após a data da carga, então o cartão pode não virar corretamente para o estado **Aguardando liberação**.

## Plano
1. Alterar o fluxo do botão **Registrar chegada do veículo** para terceirizados vinculados a carga entrar direto no pátio:
   - preencher `horario_chegada` e `horario_entrada` com a data/hora atual;
   - definir `etapa_terceirizado = 'no_patio'`;
   - manter o vínculo com `carga_id`, placa, motorista e transportadora.

2. Marcar o veículo esperado como conferido somente após essa entrada direta, para ele sair de **Esperados** e aparecer em **Pátio**.

3. Ajustar o texto/toast do botão para não falar mais em “depois libera para o pátio”, evitando confusão operacional.

4. Manter o painel azul para cargas ainda sem chegada registrada, mas remover do fluxo novo a necessidade do segundo clique **Liberar entrada no pátio** para esse caso.

## Resultado esperado
Quando você clicar em **Registrar chegada do veículo** para o Raimundo, ele deve aparecer imediatamente na aba **Pátio**, pronto para seguir o próximo passo do fluxo de saída/finalização.