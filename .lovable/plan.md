Identifiquei a causa: ao salvar o pedido completo do ALCIR / JR MIX, o primeiro item salva, mas os demais recebem erro 409 por violação da chave única `row_op_key`. O payload de update está reaproveitando `operation_id` e `row_op_key` antigos em todos os itens do grupo; por isso várias linhas tentam ficar com a mesma chave e o banco bloqueia. Como o lote falha, as rupturas desmarcadas nos demais produtos não persistem e voltam no recarregamento.

Plano de correção:

1. Ajustar o payload de edição no `CarregamentoDialog`
   - Remover `operation_id` e `row_op_key` dos campos herdados do formulário em updates.
   - Manter essas chaves apenas para inserções novas, onde fazem sentido como idempotência.
   - Assim cada item existente preserva sua própria chave no banco e não tenta copiar a chave do item principal.

2. Corrigir o tratamento de conflito em updates no hook de carregamentos
   - Em `useBatchUpdateCarregamento`, parar de tratar erro `23505` como “sucesso silencioso” em update.
   - Em update, `23505` significa conflito real de chave/constraint e deve aparecer para o usuário.
   - A mensagem de erro será clara, para não parecer que salvou quando não salvou.

3. Fortalecer a limpeza de campos técnicos
   - Garantir que updates individuais e em grupo nunca enviem campos de idempotência antigos.
   - Revisar se o cascade de campos compartilhados em `Index.tsx` também não propaga campos técnicos indevidos.

4. Validar o caso específico
   - Conferir que ao desmarcar rupturas no pedido ALCIR / JR MIX, todos os itens alterados enviam apenas dados editáveis.
   - Confirmar que a edição não gera mais 409 e que as rupturas não retornam após o recarregamento.