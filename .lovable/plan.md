## Acesso Admin ao Painel do Vendedor

Hoje o `/meu-painel` é restrito à role `vendedor` (filtra por `get_my_vendedor_id()` via RLS). Admin não tem como visualizar o painel individual de cada vendedor.

### O que será feito

1. **Rota nova**: `/meu-painel/:vendedorId` (somente Admin)
   - Reaproveita a tela `MeuPainel.tsx`, mas recebe um `vendedorId` opcional via params.
   - Se Admin → usa o `vendedorId` da URL.
   - Se Vendedor → ignora a URL e força o próprio `vendedor_id` (segurança).

2. **Hook `useMeuPainel`**: aceitar `vendedorIdOverride`
   - Quando Admin acessa, as queries filtram por `vendedor_id = override` (sem depender de RLS de vendedor).
   - Admin já tem policy permissiva em `carregamentos_dia`, então não precisa mexer no banco.

3. **Header do painel**: quando Admin estiver vendo
   - Mostrar dropdown "Trocar vendedor" com lista de `vendedores` ativos.
   - Badge "Visualizando como Admin" para deixar claro que é uma visão externa.

4. **Sidebar (Admin)**: adicionar item "Painel do Vendedor"
   - Abre uma tela de seleção (`/vendedores-painel`) com cards/lista dos vendedores → clique entra em `/meu-painel/:id`.
   - Ou, alternativamente, o item já leva direto para o primeiro vendedor da lista. **Vou usar a tela de seleção** (mais limpa para 10+ vendedores).

5. **Página de seleção `VendedoresPainel.tsx`** (Admin only)
   - Lista vendedores ativos com mini-KPI (nº de pedidos últimos 7 dias).
   - Busca por nome/código.
   - Clique → navega para `/meu-painel/:id`.

### Arquivos

**Novos**
- `src/pages/VendedoresPainel.tsx` — lista de vendedores para Admin escolher.

**Editados**
- `src/App.tsx` — registrar rotas `/vendedores-painel` e `/meu-painel/:vendedorId` (ambas protegidas para Admin; `/meu-painel` continua para Vendedor).
- `src/pages/MeuPainel.tsx` — ler `useParams`, detectar role, header com seletor + badge para Admin.
- `src/hooks/useMeuPainel.ts` — aceitar `vendedorId` opcional como argumento.
- `src/components/AppSidebar.tsx` — adicionar item "Painel do Vendedor" (apenas Admin).
- `src/components/ProtectedRoute.tsx` — sem mudanças (já suporta múltiplas roles via `allowedRoles`).

### Sem mudanças no banco

As políticas atuais já permitem: Admin tem `SELECT` permissivo em `carregamentos_dia`, `vendedores` e `clientes`. A nova policy de `vendedor` é aditiva e não bloqueia o Admin.