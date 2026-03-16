

# Adicionar coluna Cidade na tabela e no formulário

## Situação atual
A tabela `carregamentos_dia` já possui a coluna `cidade` no banco de dados, mas ela não está sendo exibida na tabela nem no formulário de cadastro.

## Alterações

### 1. `src/components/dashboard/CarregamentoTable.tsx`
- **Desktop**: Adicionar coluna "Cidade" no header e nas rows, logo antes de "UF"
- **Mobile**: Adicionar linha "Cidade" na grid de detalhes, antes de "UF"
- Atualizar `colCount` para incluir a nova coluna

### 2. `src/components/dashboard/CarregamentoDialog.tsx`
- Adicionar campo de input "Cidade" na seção de vendas, ao lado do campo UF (na mesma linha de Data / N° Pedido / UF, expandindo para 4 colunas, ou em linha separada)
- O campo será um input de texto livre vinculado a `form.cidade`

### 3. `src/components/dashboard/KanbanView.tsx`
- Exibir cidade junto com UF nos cards (ex: `{c.cidade} - {c.uf}`)

