

# Remover badge D-X (atraso) da tabela de carregamentos

## Alterações em `src/components/dashboard/CarregamentoTable.tsx`

1. **Remover o componente `PreviousDayBadge`** (linhas 39-57) por completo.
2. **Remover a chamada `<PreviousDayBadge ... />`** na linha 432.
3. **Limpar imports não utilizados** (`TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` — se não forem usados em outro lugar do arquivo).

Nenhuma alteração no banco de dados.

