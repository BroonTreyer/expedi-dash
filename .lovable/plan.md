Plano para corrigir sem quebrar o fluxo atual:

1. Ajustar o estado do Fagno agora
- O registro atual do Fagno está com `carga_id = JR ROTA` e `status_autorizacao = autorizado`, por isso ele saiu do card vermelho e não aparece em Fechar Carga.
- Vou retornar o registro ativo dele para `aguardando_vinculo` e limpar o vínculo de carga pendente, preservando placa, motorista, transportadora e horário de chegada.

2. Corrigir a causa no código
- Em `useVincularMovimentoACarga`, ao vincular um movimento órfão, não vou mais criar/alterar `veiculos_esperados` como `autorizado` imediatamente.
- O vínculo manual direto continuará anexando a carga ao movimento quando usado, mas não deve “sumir” com o veículo do fluxo de espera antes da Portaria liberar corretamente.

3. Fazer o Fagno aparecer em Fechar Carga
- Em `useVeiculosAguardandoVinculo`, manter a lista baseada em `veiculos_esperados` aguardando vínculo.
- Adicionar fallback para incluir movimentos órfãos da Portaria (`terceirizado`, `entrada`, `chegada`, sem `horario_entrada`) como veículos aguardando vínculo, mesmo quando não existir ou estiver inconsistente o registro em `veiculos_esperados`.
- Remover duplicidade por placa, priorizando o registro correto de `veiculos_esperados` quando existir.

4. Garantir fechamento sem bug
- Ao fechar a carga com um veículo selecionado, se ele veio desse fallback de movimento órfão, o fechamento deve atualizar também a movimentação da Portaria com o `carga_id` gerado.
- Se ele veio de `veiculos_esperados`, mantém o comportamento atual.

5. Validação
- Conferir no banco que Fagno/QWE1B20 volta para o card vermelho.
- Conferir que ele aparece na seção “Veículos no pátio aguardando vínculo” dentro de Fechar Carga.
- Manter os filtros por sessão e invalidação de cache existentes.