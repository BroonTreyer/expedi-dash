

# Bloquear Faturamento de alterar status em Rupturas

## Mudança

No `src/pages/Rupturas.tsx`, remover `isFaturamento` da guard do `handleStatusChange` — ficando apenas `isAdmin` e `isLogistica`.

No `src/components/dashboard/CarregamentoTable.tsx`, verificar se o `canChangeStatus` precisa ser condicional por página. Como a tabela recebe `userRole` e calcula internamente, a restrição precisa vir da página (não passando o callback) ou do componente. A forma mais simples: na página Rupturas, o `handleStatusChange` já bloqueia faturamento no callback — basta remover `isFaturamento` da guard.

Porém, o `StatusSelect` na tabela ainda renderiza o dropdown para faturamento (pois `canChangeStatus = isAdmin || isLogistica || isFaturamento`). Precisamos também passar uma prop ou ajustar para que na página de Rupturas o faturamento veja o status como somente leitura.

**Abordagem**: Adicionar prop `canChangeStatus` opcional ao `CarregamentoTable`. Na Rupturas, passar `canChangeStatus={isAdmin || isLogistica}` (sem faturamento). No Index, manter o comportamento atual.

## Arquivos (2)
- `src/pages/Rupturas.tsx` — remover `isFaturamento` do `handleStatusChange` e passar `canChangeStatus={isAdmin || isLogistica}`
- `src/components/dashboard/CarregamentoTable.tsx` — aceitar prop `canChangeStatus` opcional, usar ela no lugar do cálculo interno quando fornecida

