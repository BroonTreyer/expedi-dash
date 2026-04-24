## Reorganizar colunas da tabela do Painel

### `src/pages/Index.tsx`
- Atualizar prop `hideColumns` do `<CarregamentoTable>` para:
  `["etapa", "tipo_caminhao", "motorista", "nome_carga"]`

### `src/components/dashboard/CarregamentoTable.tsx`
- **Reordenar**: mover a coluna "Dt. Cadastro" (`created_at`) para a primeira posição após a coluna de Status (e checkbox de seleção quando aplicável). Aplicar nos templates: Header, linha única, linha agrupada (pai) e linhas filhas.
- **Ocultação condicional**: envolver `TableHead` e `TableCell` de "Caminhão" (`tipo_caminhao`), "Motorista" (`motorista`) e "Carga" (`nome_carga`) com guards `!hideColumns.includes(...)`.
- **colCount dinâmico**: recalcular `colCount` subtraindo cada coluna oculta presente em `hideColumns` para manter `colSpan` correto nas linhas expandidas/agrupadas.
- **Mobile (`MobileCardItem`)**: respeitar `hideColumns` e não renderizar os blocos Caminhão, Motorista e Carga quando ocultos.

### Comportamento resultante
- Painel principal: Dt. Cadastro fica como primeira coluna de dados; Etapa, Caminhão, Motorista e Carga ficam ocultos. Demais telas que usam `CarregamentoTable` sem `hideColumns` não são afetadas.
