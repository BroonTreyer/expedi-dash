# Corrigir identificação da EDIVAR ROTA em Distribuidores

## Estado confirmado

- A carga `EDIVAR ROTA` (`CG-20260807-143358-63I`) está cadastrada com a transportadora `MOREIRA - ALVORADA`.
- A movimentação da placa `RBX3J69` está ativa como `terceirizado`, na etapa `no_patio`, sem saída registrada.
- Ela já aparece em **Portaria → Distribuidores → Pátio**, mas a linha mostra apenas a placa e o motorista porque o campo de empresa da movimentação está vazio e o nome da carga não é exibido nessa lista.
- Pela categoria `terceirizado`, essa movimentação não pertence ao Varejo.

## Ajuste

1. Corrigir o registro atual para carregar a transportadora `MOREIRA - ALVORADA` também na movimentação da portaria.
2. Fazer a lista do pátio exibir claramente o nome da carga e a transportadora, usando os dados da carga vinculada quando a movimentação estiver incompleta.
3. Garantir que movimentações vinculadas a cargas com transportadora permaneçam classificadas exclusivamente como `terceirizado`, evitando aparecer no Varejo.
4. Validar na tela que `EDIVAR ROTA / RBX3J69` aparece somente em **Distribuidores**, com carga e transportadora identificadas.

## Detalhes técnicos

- Preservar o fluxo atual de chegada, pátio e saída.
- Aplicar a correção apenas à classificação e à identificação visual; nenhum status operacional será alterado.