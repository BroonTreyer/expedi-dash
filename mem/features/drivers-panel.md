---
name: Drivers panel
description: Read-only painel de motoristas com KM, horários, tempo de rota e status em tempo real
type: feature
---
Página `/motoristas-painel` (admin + logística) consome `movimentacoes_portaria` agregada por nome do motorista. Métricas: rotas, KM total/médio (km_rodado ou km_final-km_inicial com cap 5000), tempo médio (horario_real_saida → retorno/saida_final), peso, entregas. Tabs: Ranking (tabela ordenável + sparkline) e Em Rota Agora (cards realtime). Drawer com timeline de cada rota. Realtime debounce 1.5s. Limite 5000 movs por janela. Sem mudança de schema — só leitura.
