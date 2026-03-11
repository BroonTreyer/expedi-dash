

# Níveis de Usuário: Logística, Faturamento e Admin

## Visão Geral

Implementar autenticação com 3 níveis de acesso:
- **Logística**: só pode completar pedidos (preencher caminhão, motorista, placa, mudar status)
- **Faturamento**: pode visualizar e gerenciar faturamento (futuro)
- **Admin**: acesso total (criar/editar/deletar tudo, gerenciar usuários)

## Banco de Dados

### Migration 1: Tabela de roles + profiles
```sql
-- Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'logistica', 'faturamento');

-- Tabela de roles (separada, conforme boas práticas)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Tabela de profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Função security definer para checar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- RLS: profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin reads all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS: user_roles
CREATE POLICY "Admin manages roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Trigger: criar profile + role padrão no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'logistica');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Frontend

### 1. Página de Login/Cadastro (`src/pages/Auth.tsx`)
- Formulário de login (email + senha)
- Formulário de cadastro (nome, email, senha)
- Sem confirmação por email (auto-confirm habilitado)
- Rota `/auth`

### 2. Hook de autenticação (`src/hooks/useAuth.ts`)
- Gerencia sessão com `onAuthStateChange`
- Busca role do usuário logado em `user_roles`
- Expõe: `user`, `role`, `loading`, `signIn`, `signUp`, `signOut`

### 3. Proteção de rotas (`src/components/ProtectedRoute.tsx`)
- Redireciona para `/auth` se não logado
- Recebe prop `allowedRoles` para controlar acesso

### 4. Controle de permissões por role

| Funcionalidade | Logística | Faturamento | Admin |
|---|---|---|---|
| Ver painel/tabela | Sim | Sim | Sim |
| Completar pedido (caminhão, motorista, status) | Sim | Não | Sim |
| Criar novo pedido | Não | Não | Sim |
| Editar/deletar pedidos | Não | Não | Sim |
| Gerenciar produtos/vendedores/tipos | Não | Não | Sim |
| Gerenciar usuários | Não | Não | Sim |

### 5. Sidebar adaptativa
- Ocultar itens do menu conforme role
- Logística: só vê "Painel"
- Admin: vê tudo + "Usuários"

### 6. Página de Gerenciamento de Usuários (`src/pages/Usuarios.tsx`)
- Só acessível por admin
- Lista usuários, altera roles

### Arquivos novos
- `src/pages/Auth.tsx`
- `src/hooks/useAuth.ts`
- `src/components/ProtectedRoute.tsx`
- `src/pages/Usuarios.tsx`

### Arquivos alterados
- `src/App.tsx` — novas rotas + ProtectedRoute
- `src/components/AppSidebar.tsx` — menu condicional por role
- `src/pages/Index.tsx` — esconder botões de criar/editar/deletar para não-admin
- `src/components/dashboard/CarregamentoTable.tsx` — esconder ações por role

