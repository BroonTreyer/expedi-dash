Plano para corrigir todas as ocorrências do mesmo problema:

1. Tornar a busca de `carregamentos_dia` realmente completa e estável
   - Criar um utilitário reutilizável de paginação para consultas grandes, buscando em páginas de 1.000 linhas até terminar.
   - Garantir ordenação determinística incluindo uma coluna única (`id`) no final da ordenação. Isso evita perder/duplicar linhas quando vários itens têm a mesma data, carga e número de pedido.

2. Corrigir `Gastos por Vendedor`
   - Atualizar `useGastosVendedor.ts` para selecionar também o `id` e ordenar por `data`, `carga_id`, `numero_pedido` e `id`.
   - Trocar a chave de cache para uma nova versão, forçando atualização limpa no navegador.
   - Consolidar pedidos usando uma chave mais segura: pedido + código/cliente + cidade/UF, somando todos os itens do mesmo pedido.
   - Separar cargas por uma chave operacional composta, não apenas por `carga_id`, para evitar misturar cargas com o mesmo nome em dias diferentes.
   - Manter o cálculo de `Peso vendedor`, `Peso total carga`, destinos e lista de pedidos usando o total consolidado completo.

3. Aplicar a mesma proteção nas outras telas que somam peso/pedidos
   Vou ajustar consultas que hoje podem truncar dados por limite padrão ou por `.limit(...)` grande demais:
   - `useRelatorios.ts` — exportações de resumo, rupturas e performance por vendedor.
   - `useAnalytics.ts` — dashboard analítico período atual e período anterior.
   - `useCarregamentos.ts` — painel principal e listas de cargas fechadas/aguardando.
   - `Consolidado.tsx` — visão consolidada e extras de carry-over.
   - `useCargasDiaExpedicao.ts` e `usePesoPorCarga.ts` — KPIs/pesos da expedição.
   - `VendedoresPainel.tsx` e `useAprovacoes.ts` — contagens/listagens que dependem de todos os itens.

4. Validação
   - Conferir no banco que pedidos multi-item, incluindo SENDAS #104, somam todas as linhas.
   - Abrir `Gastos por Vendedor`, expandir vendedores/cargas e confirmar que os pedidos consolidados exibem o total correto, não apenas uma parte como 9.000 kg.
   - Verificar que a aba não volta a apresentar erro de React/ref e que as consultas usam paginação completa.

Não há alteração de banco necessária; será correção de busca, cache e agrupamento no frontend.