Encontrei o problema: o Fagno está no banco aguardando vínculo com a placa **QWE1B20**, e a carga **JR ROTA** existe em Logística. Mas o fluxo atual só “libera” corretamente quando há um registro em `veiculos_esperados`; o caso do Fagno veio direto como movimentação órfã em `movimentacoes_portaria`, então o diálogo até pode listar cargas, mas o vínculo não cria/atualiza o registro esperado para a Portaria continuar o processo.

Plano de correção:

1. Ajustar `useVincularMovimentoACarga`
   - Ao vincular uma movimentação órfã, além de colocar `carga_id` na movimentação e atualizar a placa/motorista da carga, criar ou atualizar um registro em `veiculos_esperados` para a mesma placa/carga.
   - Esse registro ficará como `status_autorizacao = 'autorizado'`, `conferido = false`, `walk_in = true`, permitindo aparecer na etapa “Carga vinculada — clique para liberar entrada no pátio”.

2. Corrigir invalidação de cache
   - Invalidar também `veiculos_walkin_ativos`, `veiculos_walkin_pendentes_count` e `movimentacoes_portaria_aguardando_vinculo` depois do vínculo.
   - Assim o card vermelho some e o card de liberação aparece sem precisar atualizar a página.

3. Remover o gargalo visual do diálogo
   - Manter a lista de cargas dos últimos 7 dias, mas garantir que cargas como **JR ROTA** não sejam escondidas por falta de registro em `veiculos_esperados`.
   - Preservar a priorização por placa coincidente.

4. Validar com dados reais
   - Confirmar que **JR ROTA / FAGNO / QWE1B20** está contemplado pelo fluxo e que o vínculo leva o veículo para a próxima etapa da Portaria.