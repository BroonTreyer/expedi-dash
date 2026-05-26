Vou corrigir o fluxo de alteração de data no Consolidado para que a data escolhida no calendário realmente apareça e permaneça após salvar.

Plano:
1. Ajustar a chave do grupo no Consolidado para incluir também a placa e a data real quando necessário, evitando que a UI reutilize uma linha antiga após a atualização.
2. Corrigir `handleDateChange` para comparar a nova data com a data exibida (`dataReal ?? data`), não apenas com `data`, garantindo que clicar em 25 dispare a atualização mesmo quando a carga ainda tem `horario_fim` em 26.
3. Atualizar a mutation de data para rebater `horario_inicio` e `horario_fim` apenas nos itens da linha selecionada (`group.items`/ids), em vez de atualizar tudo que compartilha o mesmo `carga_id`, preservando o horário e trazendo a data real para o dia selecionado.
4. Ajustar a seleção do calendário para destacar a data exibida atualmente, então depois de salvar ele deve mostrar 25/05/2026 e não voltar para 26/05/2026.