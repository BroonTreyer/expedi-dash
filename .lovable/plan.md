

# Adicionar Campo "Cliente" ao Sistema

## Mudanças

### 1. Migração no banco de dados
- Adicionar coluna `cliente` (text, nullable) na tabela `carregamentos_dia`

### 2. `src/components/dashboard/CarregamentoDialog.tsx`
- Adicionar campo de input "Cliente" na seção de vendas, ao lado de UF

### 3. `src/components/dashboard/CarregamentoTable.tsx`
- Exibir coluna "Cliente" na tabela desktop e no card mobile

### 4. `src/hooks/useCarregamentos.ts`
- Adicionar `cliente` ao type `Carregamento`

### 5. `src/pages/Rupturas.tsx`
- Incluir "cliente" na busca textual dos filtros

## Arquivos (4) + 1 migração
1. Migração SQL — nova coluna `cliente`
2. `src/hooks/useCarregamentos.ts` — type
3. `src/components/dashboard/CarregamentoDialog.tsx` — input
4. `src/components/dashboard/CarregamentoTable.tsx` — coluna
5. `src/pages/Rupturas.tsx` — busca

