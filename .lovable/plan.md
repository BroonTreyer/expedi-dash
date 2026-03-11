

# Remover Colunas "Previsto" e "Placa" da Tabela

## Alterações

### `src/components/dashboard/CarregamentoTable.tsx`
- Remover `<TableHead>Placa</TableHead>` e `<TableHead>Previsto</TableHead>` do header
- Remover as `<TableCell>` correspondentes de cada row
- Remover "Placa" do mobile card view também
- Ajustar `colSpan` da mensagem "Nenhum carregamento encontrado" (de 16/15 para 14/13)

## Arquivos (1)
1. `src/components/dashboard/CarregamentoTable.tsx`

