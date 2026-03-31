

# Sistema de Cadastro e Busca de Motoristas

## Resumo

Criar uma tabela `motoristas` no banco, uma página `/motoristas` para cadastro/busca, e integrar a busca de motoristas nos formulários da portaria (autocomplete por nome).

## Estrutura

### 1. Migration — tabela `motoristas`

```sql
CREATE TABLE motoristas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo text NOT NULL,
  telefone text,
  foto_documento_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE motoristas ENABLE ROW LEVEL SECURITY;

-- Select: todos autenticados
-- Insert/Update: admin, logistica, portaria
-- Delete: admin
```

### 2. Nova página `/motoristas`

- Lista de motoristas com busca por nome (input de pesquisa)
- Botão "Novo Motorista" abre dialog com:
  - **Nome Completo** (obrigatório)
  - **Telefone**
  - **Foto do Documento** (upload usando componente CapturaFoto existente, salva no bucket `portaria`)
- Tabela com colunas: Nome, Telefone, Data Cadastro, Ações (editar/excluir)
- Visualização da foto do documento ao clicar

### 3. Hook `useMotoristas`

- Query com busca por nome (`ilike`)
- Mutations: create, update, delete
- Upload de foto para bucket `portaria` (path: `motoristas/{id}/documento`)

### 4. Sidebar — adicionar link "Motoristas"

- Ícone: `Users` ou `Contact`
- Roles: `admin`, `logistica`, `portaria`

### 5. Rota no App.tsx

- `/motoristas` com `allowedRoles={["admin", "logistica", "portaria"]}`

### 6. Integração nos formulários da Portaria (futuro opcional)

- Nos campos `motorista` do `RegistroMovimentoDialog`, permitir buscar motorista cadastrado por nome com autocomplete, preenchendo nome e telefone automaticamente.

| Arquivo | Mudança |
|---|---|
| Migration SQL | Criar tabela `motoristas` com RLS |
| `src/hooks/useMotoristas.ts` | Hook CRUD + upload foto |
| `src/pages/Motoristas.tsx` | Página com lista, busca e dialog de cadastro |
| `src/App.tsx` | Adicionar rota `/motoristas` |
| `src/components/AppSidebar.tsx` | Adicionar link "Motoristas" no menu |

