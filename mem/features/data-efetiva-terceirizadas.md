---
name: Data efetiva terceirizadas
description: Cargas terceirizadas em Consolidado/Expedição usam data da saída pela portaria (ou finalização "Carregado"), não a data original
type: feature
---
Apenas cargas TERCEIRIZADAS (com `transportadora` preenchida).

Regra (`src/lib/data-efetiva.ts` → `computeDataEfetivaTerceirizada`):
1. Se houver `movimentacoes_portaria.horario_saida_final` (categoria=terceirizado) → usa essa data (TZ local).
2. Senão, se TODOS itens da carga estão `status='Carregado'` → usa MAX(`updated_at`).
3. Senão → mantém `data` original.

Aplicação:
- **Consolidado** (`useConsolidado` + `Consolidado.tsx`): query expandida para trazer cargas com saída no intervalo (mesmo se `data` for anterior); após `groupByCarga`, sobrescreve `g.data` com a data efetiva e filtra grupos fora do `[dateFrom..dateTo]`.
- **Expedição** (`useCargasDiaExpedicao`): query expandida para trazer cargas com saída em `dateStr`; após agregar, sobrescreve `c.data` e filtra `c.data === dateStr`.

Não muda `carregamentos_dia.data` no banco — só exibição. Cargas próprias, Logística, Rupturas, Relatórios, vendedores e portal motorista não são afetados.

Realtime: ambos invalidam queries também por mudanças em `movimentacoes_portaria` (saída final).
