# Marcelo NTN7J08 — voltar a aparecer em Distribuidores

## Diagnóstico confirmado
- A OC **134676**, carga **MERCEARIA RIO BRANCO**, tem entrada registrada em **09/10 às 10h06**, sem saída.
- O movimento está classificado como **terceirizado**, mas continua na etapa **Chegada** e recebeu também a etapa do Varejo **chegou**. O Pátio de Distribuidores exclui registros que continuam em Chegada.
- A carga está sem transportadora e sua previsão está no grupo **PRÓPRIA**. A liberação de entrada escolhe qual etapa atualizar pela transportadora da carga, sem alinhar a categoria do movimento.
- Você confirmou que esta carga deve ficar em **Distribuidores**, não no Varejo.

## Correção proposta
1. Corrigir somente o movimento atual de Marcelo para **No pátio**, mantendo o horário real de entrada, a chegada, os anexos e o histórico; remover a etapa indevida do Varejo. Não registrar saída nem criar outra entrada.
2. Alinhar a previsão desta carga ao grupo **TERCEIRIZADO**, preservando os dados de conferência.
3. Corrigir a liberação de entrada para não misturar etapas de Varejo e Distribuidores. Quando a categoria da chegada divergir da classificação da carga, impedir uma atualização contraditória e apresentar o conflito para correção.
4. Conferir que Marcelo aparece no Pátio de Distribuidores com a OC correta, sem aparecer simultaneamente no Varejo e sem ser marcado como expedido.

## Nome da transportadora
O nome não foi informado. Não usar o nome do cliente como transportadora nem inventar um cadastro. A recuperação do movimento pode ser feita sem essa informação; completar a transportadora da carga ficará pendente do nome correto.

## Detalhes técnicos
- Correção pontual e transacional em `movimentacoes_portaria` e `veiculos_esperados`, condicionada ao movimento ainda estar aberto e vinculado à carga identificada.
- Ajustar `CargasFechadasAguardandoPanel.tsx` para validar a categoria do movimento antes da liberação e manter categoria/etapa coerentes.
- Testar chegada de Distribuidores, entrada já liberada e conflito com carga sem transportadora; verificar a exibição na portaria após a correção.
- Não alterar permissões, registros antigos de Marcelo nem classificações de outros clientes.
