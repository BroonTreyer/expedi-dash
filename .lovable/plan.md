## Portal do Vendedor

Cada vendedor da Frico ganha um login próprio que abre um painel restrito aos pedidos vinculados ao seu `vendedor_id`. Admin/Logística/Faturamento continuam vendo tudo no sistema atual; quem entra como "vendedor" vai direto para `/meu-painel` e não enxerga o restante.

### O que o vendedor verá

- **Cabeçalho com nome do vendedor + filtro de período** (padrão: Últimos 7 dias; atalhos Hoje, 7 dias, Mês atual, intervalo customizado).
- **KPIs**: Pedidos no período, Peso total expedido (kg), Ticket médio (kg/pedido), % de Ruptura.
- **Cargas / Pedidos em andamento**: lista compacta agrupada por etapa (Vendas → Logística → Carregado), com cliente, peso, placa e status. Linha clicável abre modal somente-leitura com os itens.
- **Gráficos** (4 mini-charts em grid 2×2): evolução diária de peso, Top 10 clientes (barra horizontal), Top 10 produtos, distribuição por UF.
- **Minhas Rupturas**: bloco vermelho com pedidos do vendedor que tiveram falta no período (produto, cliente, motivo, data).

Tudo somente-leitura. Vendedor não cria, edita ou exclui nada.

### Como o acesso funciona

1. Admin abre **Usuários** (Super Admin) e cria a conta do vendedor escolhendo:
   - papel = `vendedor`
   - vínculo = qual cadastro de `vendedores` pertence a esse login (dropdown).
2. Vendedor recebe email/senha e entra em `/auth` normalmente.
3. Ao logar, é redirecionado automaticamente para `/meu-painel` e a sidebar mostra apenas: **Meu Painel** e **Sair**.
4. Todas as queries filtram por `vendedor_id = (meu vínculo)` via RLS — vendedor não consegue ver dados de colega nem mesmo via API.

---

## Detalhes técnicos

### Banco (migration)

1. Adicionar valor `'vendedor'` ao enum `app_role`.
2. Nova tabela `vendedor_users` (vínculo 1:1 entre `auth.users` e `vendedores`):
   - `user_id uuid PK references auth.users on delete cascade`
   - `vendedor_id uuid not null references vendedores(id) on delete cascade`
   - `unique(vendedor_id)`  ← um vendedor = um login
   - RLS: `select` próprio + admin lê todos; `insert/update/delete` só admin.
3. Função `security definer` `public.get_my_vendedor_id()` → retorna o `vendedor_id` do `auth.uid()`.
4. **Novas políticas RLS** em `carregamentos_dia` e `clientes` para o papel `vendedor` (somente SELECT, sem mexer nas existentes):
   - `carregamentos_dia`: `vendedor_id = public.get_my_vendedor_id()`.
   - `clientes`: liberado SELECT (precisa para o nome) — ou via view se quisermos restringir.
5. Atualizar `handle_new_user()`: se metadata trouxer `role = 'vendedor'` + `vendedor_id`, criar entrada em `user_roles` e `vendedor_users` em vez do default `logistica`.

### Frontend

- `src/hooks/useAuth.ts`: incluir `'vendedor'` em `AppRole`.
- `src/components/ProtectedRoute.tsx`: redirecionamento por papel — se `role === 'vendedor'`, fallback é `/meu-painel`.
- `src/components/AppSidebar.tsx`: árvore reduzida para vendedor (apenas item "Meu Painel" + Sair).
- `src/App.tsx`: nova rota `/meu-painel` protegida por `allowedRoles={["vendedor"]}` (lazy).
- `src/pages/MeuPainel.tsx` (nova): orquestra os blocos abaixo.
- `src/components/vendedor/`:
  - `KpiVendedor.tsx` (4 cards)
  - `CargasAndamentoVendedor.tsx` (lista agrupada por etapa)
  - `GraficosVendedor.tsx` (Recharts, paleta já memorizada)
  - `RupturasVendedor.tsx` (bloco vermelho — usa cor reservada para Rupturas)
- `src/hooks/useMeuPainel.ts`: query única `enabled: !!session && role === 'vendedor'`, com `dateRange`. Reaproveita estrutura paginada do `useCarregamentos` mas sem filtro de etapa.
- **Página Usuários** (`src/pages/Usuarios.tsx`): no formulário de novo usuário, ao escolher papel `vendedor`, exibir um `Select` obrigatório com a lista de `vendedores` ainda não vinculados. Edge function `create-user` recebe `vendedor_id` e cria a linha em `vendedor_users` após criar o auth user.

### Formato

- Datas/números em pt-BR (já padrão).
- Mobile-first: KPIs viram coluna única, gráficos empilham, lista vira cards.
- Responsivo conforme padrão do projeto (Slate, vermelho só em rupturas).

### Fora de escopo

- Edição de pedidos pelo vendedor.
- Notificações em tempo real para o vendedor (pode entrar numa v2).
- Comissões/valor financeiro (sistema não rastreia preço hoje — confirmado em "Operational scope").

---

Pronto para implementar assim que você aprovar.