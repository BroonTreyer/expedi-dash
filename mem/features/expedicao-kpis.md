---
name: Expedicao KPIs
description: KPIs de peso da Expedição Terceirizado — buckets Carregado/A carregar e regra do dia
type: feature
---
Painel "Expedição — Terceirizado" usa `useCargasDiaExpedicao(dateStr)` (somente a data selecionada, SEM carry-over de 30d — diferente do Consolidado) cruzado com `useStatusPortariaPorCarga`.

Universo: cargas de `carregamentos_dia` com `transportadora` preenchida, agrupadas por `carga_id`. Peso = `pesoEfetivo` (rupturas totais = 0). Status agregado da carga = "Carregado" só se TODOS os itens estão "Carregado"; caso contrário usa "Carregando" se houver, senão o primeiro status.

Buckets KPI:
- **Carregado / em carregamento**: etapa portaria ∈ {`patio`, `carregando`, `expedido`} OU `status='Carregado'` no carregamento (fallback p/ quando faturamento finaliza antes da portaria registrar saída).
- **A carregar**: restante (`aguardando`, `chegou`).
- **Total previsto do dia**: soma dos dois.

Etapa `patio` conta como "em carregamento" (caminhão dentro do pátio = já em processo).
