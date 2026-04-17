
## Diagnóstico

Hoje `clientes` tem só `codigo_cliente`, `nome_cliente`, `cidade`, `uf`, `ativo`. Você quer que a nova planilha traga também o **CEP** e que o **UF seja inferido automaticamente do CEP** (não precisa endereço completo, número, bairro etc).

## Plano

### 1. Schema
Migration: `ALTER TABLE clientes ADD COLUMN cep text;`

### 2. Importador (`src/pages/Clientes.tsx`)
- Detectar coluna `CEP` no header da planilha (por nome, não índice fixo) — funciona mesmo se a ordem mudar
- Manter detecção das já existentes: código, nome, cidade, UF
- Normalizar CEP: só dígitos, 8 chars, descartando inválidos
- Para cada linha: se UF veio na planilha, usa direto; **se UF estiver vazio mas CEP existir**, derivar UF do prefixo do CEP via tabela local de faixas dos Correios (estática, sem API — ex: 01000-19999=SP, 20000-28999=RJ, 72800-72999=GO, etc.)
- Manter `upsert` por `codigo_cliente`

### 3. Hook (`src/hooks/useClientes.ts`)
- Adicionar `cep?: string` em `useCreateCliente` e `useUpdateCliente`
- Sem mudança na propagação para `carregamentos_dia` (continua só nome/cidade/UF)

### 4. UI mínima (`src/pages/Clientes.tsx`)
- Form de cadastro/edição: novo input `CEP` (com máscara `00000-000`); ao sair do campo, se UF estiver vazio, autopreencher UF a partir do CEP
- Tabela desktop: adicionar coluna **CEP** (compacta, após Cidade)
- Card mobile: mostrar CEP abaixo de Cidade/UF

### Sem mudanças
- RLS, fluxo de cargas, propagação de cliente para pedidos, schema das demais tabelas

## Arquivos
- 🆕 migration — `ALTER TABLE clientes ADD COLUMN cep text`
- 🆕 `src/lib/cep-uf.ts` — função `ufFromCep(cep)` com tabela de faixas dos Correios
- ✏️ `src/hooks/useClientes.ts` — incluir `cep` nas mutations
- ✏️ `src/pages/Clientes.tsx` — importador por header + coluna/input CEP + autofill UF
