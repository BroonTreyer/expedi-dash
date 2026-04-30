## Objetivo

Criar um novo nível de usuário **Expedição** que tem acesso somente à aba **Expedição** (`/expedicao`). Não verá Painel, Portaria, Consolidado, Cadastros, etc.

## O que será feito

### 1. Banco de dados (migration)
- Adicionar valor `'expedicao'` ao enum `public.app_role`.
- Atualizar políticas RLS necessárias para que esse role consiga **ler** os dados que a tela de Expedição já consome:
  - `carregamentos_dia` (SELECT já é `true` para autenticados — ok, sem mudança).
  - `movimentacoes_portaria`: hoje SELECT exige admin/logistica/portaria. Adicionar `expedicao` no SELECT (não no INSERT/UPDATE — read-only).
  - `veiculos_esperados`: SELECT já é `true` — ok.
  - Demais tabelas usadas na tela de Expedição (KPIs / PainelChegou) ficam read-only via SELECT existente.
- O role **não** ganha permissão de INSERT/UPDATE/DELETE em nenhuma tabela operacional. A ação "Descartar chegada" do `PainelChegou` continuará restrita a admin/logistica/portaria (já é hoje).

### 2. Edge function `create-user`
- Incluir `'expedicao'` em `VALID_ROLES` para permitir criação pelo painel de Usuários.

### 3. Frontend

**`src/hooks/useAuth.ts`**
- Estender o tipo: `AppRole = "admin" | "logistica" | "faturamento" | "portaria" | "vendedor" | "expedicao"`.

**`src/pages/Usuarios.tsx`**
- Adicionar `expedicao: "Expedição"` em `ROLE_LABELS`.
- Adicionar `<SelectItem value="expedicao">Expedição</SelectItem>` no `RoleSelect` e no formulário de criação.

**`src/components/AppSidebar.tsx`**
- Adicionar `"expedicao"` ao tipo `Role`.
- Adicionar `"expedicao"` apenas no item `{ to: "/expedicao", label: "Expedição" }`. Nenhum outro item.
- Resultado: usuário com esse role vê apenas o link "Expedição" na sidebar.

**`src/App.tsx`**
- Em `<Route path="/expedicao">`, incluir `"expedicao"` em `allowedRoles`.
- Demais rotas permanecem inacessíveis (o `ProtectedRoute` redireciona).

**`src/components/ProtectedRoute.tsx`** (verificar)
- Se a rota raiz `/` redireciona conforme o role, garantir que role `expedicao` seja redirecionado para `/expedicao` ao logar (ajustar lógica de fallback se existir, similar ao `vendedor` → `/meu-painel`).

### 4. Memória
- Atualizar `mem://auth/role-management` indicando que `expedicao` é um role read-only com escopo único na tela de Expedição.

## Detalhes técnicos

```sql
-- migration
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'expedicao';

-- atualizar SELECT em movimentacoes_portaria
DROP POLICY "Ops select movimentacoes_portaria" ON public.movimentacoes_portaria;
CREATE POLICY "Ops select movimentacoes_portaria"
  ON public.movimentacoes_portaria FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'logistica'::app_role)
    OR has_role(auth.uid(), 'portaria'::app_role)
    OR has_role(auth.uid(), 'expedicao'::app_role)
  );
```

Após o role ser criado pelo Admin no painel de Usuários, o usuário "Expedição" fará login e cairá direto na tela `/expedicao`, sem acesso a nenhuma outra rota do sistema.

## Confirmação

A tela `/expedicao` já é read-only (apenas exibe cards/painéis). Nenhuma ação destrutiva ficará disponível para esse role. Confirma que deve ser **somente leitura** (sem botões de descartar chegada, etc.)?
