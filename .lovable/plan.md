

# Remover colunas "Qtd" e "Obs" da tabela

## Mudanças em `src/components/dashboard/CarregamentoTable.tsx`

### Desktop
- **Header**: Remover `<TableHead>` de "Qtd" (linha 273) e "Obs" (linha 283)
- **Single row**: Remover célula Qtd (linha 331) e célula Obs (linha 341)
- **Summary row (grupo)**: Remover célula totalQtd (linha 411) e célula Obs vazia (linha 421)
- **Expanded rows**: Remover célula Qtd (linha 469) e célula Obs (linha 479)
- **colCount**: Reduzir de 13 para 11 (remover 2 colunas fixas); remover o check `hideColumns.includes("qtd")` do cálculo

### Mobile
- Remover referência a `totalQtd` no header do grupo (linha 122 — manter só peso)
- Na `MobileCardItem`, remover a seção "Qtd / Peso" que mostra quantidade (linhas 190-195) — manter só peso se necessário, ou simplificar

### Ajustes menores
- O campo `hideColumns.includes("qtd")` deixa de ser necessário em vários lugares
- A variável `totalQtd` nos grupos pode ser removida onde não for mais usada

## Arquivo afetado
- `src/components/dashboard/CarregamentoTable.tsx`

