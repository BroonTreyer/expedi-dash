Vou corrigir o fluxo para que, ao clicar em **Registrar chegada do veículo**, o card azul mude imediatamente para **Aguardando liberação** e mostre o botão **Liberar entrada no pátio**.

Plano:
1. Ajustar a invalidação/refetch após registrar chegada para também atualizar o painel `cargas_fechadas_aguardando` e o status da Portaria de forma imediata.
2. Corrigir a lógica do painel de cargas aguardando para reconhecer a chegada recém-criada por `carga_id + placa`, sem depender de dados antigos/cacheados.
3. Se necessário, limpar o registro atual do Lucas apenas para deixar em estado correto: chegada registrada, fora do pátio, aguardando liberação.

Resultado esperado:
- Primeiro clique: registra chegada e o card vira **Aguardando liberação**.
- Segundo passo separado: só quando clicar em **Liberar entrada no pátio**, ele passa para o pátio.
- Sem duplicar registro e sem mandar direto para o pátio.