

# Cadastrar clientes da planilha

## Situação atual
- A tabela `clientes` **não possui** coluna `cidade` -- precisa ser adicionada.
- A planilha contém ~4.760 clientes com Código, Razão Social e Cidade.
- A página e hooks de Clientes não suportam o campo cidade.

## Plano

### 1. Migração: adicionar coluna `cidade` à tabela `clientes`
```sql
ALTER TABLE public.clientes ADD COLUMN cidade text;
```

### 2. Inserir os clientes via SQL em lotes
- Extrair todos os registros da planilha (Cod. Parceiro → `codigo_cliente`, Razao Social → `nome_cliente`, Cidade → `cidade`)
- Inserir em lotes usando `INSERT ... ON CONFLICT (codigo_cliente) DO UPDATE` para evitar duplicatas
- Todos inseridos como `ativo = true`

### 3. Atualizar código para suportar campo `cidade`

**`src/hooks/useClientes.ts`**: Adicionar `cidade` nos tipos de create/update mutations.

**`src/pages/Clientes.tsx`**:
- Adicionar coluna "Cidade" na tabela
- Adicionar campo "Cidade" no formulário de cadastro/edição
- Incluir cidade no filtro de busca
- Atualizar o state do form para incluir `cidade`

