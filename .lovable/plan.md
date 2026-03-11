

# Remover colunas Etapa, Qtd e Peso da tabela de Rupturas

## Mudança

Adicionar uma prop `hiddenColumns` (ou similar) ao `CarregamentoTable` para que a página de Rupturas possa ocultar as colunas "Etapa", "Qtd" e "Peso (kg)" sem afetar o painel principal.

## Arquivos (2)

1. **`src/components/dashboard/CarregamentoTable.tsx`** — aceitar prop `hideColumns?: string[]` e condicionalmente não renderizar as colunas/células de Etapa, Qtd e Peso tanto no desktop (Table) quanto no mobile (Cards)
2. **`src/pages/Rupturas.tsx`** — passar `hideColumns={["etapa", "qtd", "peso"]}` ao `CarregamentoTable`

