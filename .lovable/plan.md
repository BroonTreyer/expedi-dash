Já identifiquei a causa: ao finalizar a pré-carga, os 7 itens são atualizados em paralelo; cada linha aciona um gatilho do banco tentando criar o mesmo veículo esperado para a mesma carga. A trava única de `veiculos_esperados` bloqueia essas inserções duplicadas, o lote falha inteiro e a pré-carga continua disponível.

Plano de correção:

1. Corrigir a regra do banco que cria veículos esperados
   - Ajustar o gatilho de vínculo tardio para não competir com o gatilho de “carga fechada”.
   - Tornar a criação do veículo esperado idempotente: se já existir previsão para a mesma `carga_id`, não deve quebrar o fechamento.
   - Preservar o fluxo de walk-in/portaria já existente.

2. Remover duplicidade no frontend do fechamento
   - Parar de criar `veiculos_esperados` manualmente em `Index.tsx` depois do fechamento, porque o banco já faz isso.
   - Manter o toast de sucesso apenas após os 7 itens realmente virarem `logistica`.
   - Manter o modal aberto com erro visível se o banco rejeitar algo.

3. Reparar a carga SEIKOMAR atual
   - Finalizar a pré-carga `PRE-20260522-161438-GP5` como carga real com os dados do romaneio: SEIKOMAR, Carlos Alberto Pereira de Almeida, placa QIB8H90, transportadora Moreira - Alvorada, carreta, horário 13:00 e OC 129862.
   - Criar/garantir somente um veículo esperado para essa nova carga real.
   - Não mexer nas cargas antigas já finalizadas de SEIKOMAR nem no registro antigo já conferido.

4. Validar o estado final
   - Confirmar que SEIKOMAR não aparece mais em “Pré-cargas”.
   - Confirmar que os pedidos não aparecem como disponíveis no painel principal.
   - Confirmar que a carga aparece para a Portaria/terceirizado.
   - Confirmar que existe só um registro ativo em `veiculos_esperados` para a nova carga.

Depois que você aprovar, eu aplico a migração do gatilho, ajusto o código e corrijo os dados atuais da SEIKOMAR.