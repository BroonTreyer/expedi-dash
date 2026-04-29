---
name: Drivers panel
description: Read-only painel de motoristas com KM, horários, tempo de rota e status em tempo real
type: feature
---
Página `/motoristas-painel` (admin + logística) consome `movimentacoes_portaria` agregada por nome do motorista. Métricas: rotas, KM total/médio (km_rodado ou km_final-km_inicial com cap 5000), tempo médio (horario_real_saida → retorno/saida_final), peso, entregas. Tabs: Ranking (tabela ordenável + sparkline) e Em Rota Agora (cards realtime). Drawer com timeline de cada rota mostra `ocorrencia` (amarelo) e `observacoes` da portaria (cinza) em blocos destacados, com badge "com observação" no card e contador no header/ranking (`obs_count`). Cada rota também exibe grade de fotos (placa, painel KM saída/retorno, lacre, nota, documento) com badge "N fotos" e clique abre `PhotoViewerDialog` (suporta PDF). Botão "Imprimir" abre `MotoristaPrintDialog` (A4, reusa CSS `printing-carga`/`carga-print-root`) com KPIs do período + lista cronológica completa de rotas incluindo observações por extenso e até 4 thumbnails (placa/painel saída/painel retorno/lacre) por rota. Realtime debounce 1.5s. Limite 5000 movs por janela. Sem mudança de schema — só leitura.
