Diagnóstico confirmado:

- No banco, o pedido SENDAS FEIRA DE SANTANA de 30/04, nº 104, está correto: 4 linhas somando 29.000 kg.
- O problema não é mais cache do navegador: a requisição da tela estava buscando linhas individuais de `carregamentos_dia`, e a visualização/listagem consegue exibir itens parciais do mesmo pedido/carga, dando a impressão de 9k quando deveria consolidar o pedido inteiro.
- A correção deve ser na lógica de consolidação da aba “Gastos por Vendedor”, não com botão manual.

Plano de correção:

1. Ajustar `src/hooks/useGastosVendedor.ts`
   - Antes de montar os detalhes por carga/destino/vendedor, consolidar os registros por chave lógica de pedido/produto:
     - prioridade: `operation_id` quando existir;
     - fallback: `data + numero_pedido + vendedor_id + codigo_cliente + carga_id`.
   - Nos detalhes “Pedidos consolidados deste vendedor na carga”, mostrar cada pedido uma única vez com o peso total somado.
   - Manter os cálculos de destino/carga/vendedor usando a soma real dos itens, sem duplicar e sem pegar apenas uma linha parcial.

2. Proteger contra dados afetados por edições antigas
   - Garantir que a consolidação some todas as linhas do mesmo pedido, inclusive pedidos multi-item antigos que não tenham `operation_id`.
   - Preservar os campos necessários para tarifa (`cidade`, `uf`, `codigo_cliente`, `tipo_frete`, `vendedor_id`) usando os dados do grupo consolidado.

3. Reduzir risco de cache velho nessa aba
   - Trocar a query key de `gastos_vendedor_v5_tabelas` para uma nova versão, por exemplo `gastos_vendedor_v6_consolidado`, forçando o React Query a descartar o resultado antigo.
   - Atualizar também a invalidação realtime para a nova key.

4. Corrigir aviso de React no componente `Kpi`
   - O console mostra “Function components cannot be given refs” em `GastosVendedorTab`.
   - Vou revisar o uso do `Kpi` e ajustar a estrutura para remover esse warning sem alterar a UI.

5. Validação
   - Verificar que o detalhe do pedido SENDAS nº 104 passa a aparecer como 29.000 kg.
   - Conferir que os totais por vendedor/carga continuam coerentes e que FOB/misto continuam sendo filtrados como hoje.

Não vou adicionar nenhum botão novo.