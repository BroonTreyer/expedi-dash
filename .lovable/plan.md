

# Tornar usuário admin + remover cadastro público

## Alterações

### 1. Banco de dados
- Atualizar o role do usuário `matheuss-s@hotmail.com` (id: `7fae2387-3696-4dbb-b14e-348c4db9140d`) para `admin` na tabela `user_roles`

### 2. Página de login (`src/pages/Auth.tsx`)
- Remover completamente o formulário de cadastro e o botão "Não tem conta? Cadastre-se"
- Manter apenas o formulário de login (email + senha)

### 3. Página de Usuários (`src/pages/Usuarios.tsx`)
- Adicionar funcionalidade para o admin criar novos usuários (email, nome, senha, role)
- Usar uma edge function com service_role key para criar usuários via `supabase.auth.admin.createUser()`

### 4. Edge Function (`supabase/functions/create-user`)
- Recebe email, password, nome, role
- Valida que o chamador é admin (via JWT)
- Cria o usuário com `auth.admin.createUser()` (auto-confirma email)
- O trigger existente já cria profile e role padrão; a function atualiza o role se necessário

### Arquivos alterados
- `src/pages/Auth.tsx` — remover signup
- `src/pages/Usuarios.tsx` — adicionar formulário de criar usuário
- `supabase/functions/create-user/index.ts` — nova edge function

