Vou ajustar o vínculo para que cargas terceirizadas recentes apareçam mesmo quando a data passou de 72h ou quando a placa da carga é diferente da placa capturada.

Plano:
1. Em `useCargasFechadasParaVincular`, ampliar a janela de busca de 3 para 7 dias, alinhando com o painel que mostra movimentações órfãs da Portaria.
2. Em `VincularMovimentoCargaDialog`, deixar de ocultar cargas que já têm placa diferente; em vez disso, mostrar a carga com um aviso de “placa diferente”, permitindo selecionar quando a Logística precisar corrigir/vincular manualmente.
3. Aplicar o mesmo comportamento em `VincularCargaDialog` para walk-ins, evitando o mesmo problema em casos futuros.
4. Manter o salvamento atual: ao confirmar, a carga recebe a placa/motorista reais do veículo que chegou, e o movimento sai do card de aguardando vínculo.