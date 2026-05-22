---
name: Data efetiva terceirizadas
description: Cargas terceirizadas em Consolidado/Expedição usam data da saída pela portaria (ou finalização "Carregado"), não a data original
type: feature
---
Apenas cargas TERCEIRIZADAS (com `transportadora` preenchida).

Regra (`src/lib/data-efetiva.ts` → `computeDataEfetivaTerceirizada`):
1. Se houver `movimentacoes_portaria.horario_saida_final` (categoria=terceirizado) → usa essa data (TZ local).
2. Senão → `max(dataOriginal, hoje)`. Atrasadas (data < hoje) puxam para hoje e seguem visíveis; FUTURAS (ex.: fechada para amanhã) mantêm a data original e aparecem no dia planejado, não em hoje.

Consolidado: o carry-over de terceirizadas no pátio (sem saída) roda sempre que o intervalo selecionado **inclui hoje** — não só single-day hoje. Isso evita perda de peso ao expandir o filtro para 22–23.

Aplicação:
- **Consolidado** (`useConsolidado` + `Consolidado.tsx`): query expandida para trazer cargas com saída no intervalo (mesmo se `data` for anterior); após `groupByCarga`, sobrescreve `g.data` com a data efetiva e filtra grupos fora do `[dateFrom..dateTo]`.
- **Expedição** (`useCargasDiaExpedicao`): query expandida para trazer cargas com saída em `dateStr`; após agregar, sobrescreve `c.data` e filtra `c.data === dateStr`.

Não muda `carregamentos_dia.data` no banco — só exibição. Cargas próprias, Logística, Rupturas, Relatórios, vendedores e portal motorista não são afetados.

Realtime: ambos invalidam queries também por mudanças em `movimentacoes_portaria` (saída final).
