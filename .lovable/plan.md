## Problema

Ao clicar em "Registrar Quitação", o diálogo `RegistrarQuitacaoDialog` está listando cada CT-e individualmente (9 linhas para a mesma OC 130755), em vez de unificar por OC como era antes — e como já acontece no card "Aguardando Quitação".

## Solução

Em `src/components/logistica/RegistrarQuitacaoDialog.tsx`, aplicar o mesmo agrupamento por OC (já usado em `AdiantamentosTab`) tanto na tabela visual quanto no texto copiado:

1. Importar/replicar o agrupamento `consolidarPorOC` (mesma lógica: `tipo_agrupamento === "ordem"` + `transportadora` + `ordem_carga` ⇒ uma linha; senão SOLO por id). Para evitar duplicação, exportar `consolidarPorOC` de `AdiantamentosTab.tsx` (ou movê-lo para um helper) e importar aqui.
2. Renderizar **uma linha por grupo** na tabela, com:
   - Valor em aberto = soma dos `valor_saldo` do grupo
   - COD = código da transportadora
   - Transportadora = nome
   - OC / Lote = `ordem_carga` (ou número quando SOLO)
   - Opcional: badge `{qtdCtes} CT-e` ao lado da OC para indicar quantos itens foram unificados
3. Atualizar o `texto` copiado para iterar por grupos (uma linha por OC, com soma do saldo) em vez de iterar por adiantamento.
4. Manter `totalSaldo`, "Valor a Pagar", PIX, observações, data e o `reg.mutateAsync({ ids: adiantamentos.map(...) })` exatamente como estão — a quitação continua marcando todos os ADTs subjacentes.

Sem mudanças em hooks, banco ou no card "Aguardando Quitação".
