

## Super Admin + Tela de Logs + Lixeira

### O que vai mudar

Hoje qualquer usuário com nível **Admin** acessa **Backups** e **Usuários** (telas críticas — pode apagar tudo, mudar permissões, restaurar snapshots). Você quer que **só você e seu sócio** tenham esse poder, mantendo os demais admins limitados ao operacional.

Solução: criar o conceito de **Super Admin** restrito por email (`matheuscarneiro004@gmail.com` e `matheuss-s@hotmail.com`), com duas telas exclusivas — **Logs de Auditoria** (tudo que foi alterado) e **Lixeira** (tudo que foi apagado, com possibilidade de restaurar).

### 1. Super Admin (acesso restrito por email)

- Hook `useSuperAdmin()` simples: retorna `true` se `user.email` estiver na lista `["matheuscarneiro004@gmail.com", "matheuss-s@hotmail.com"]` **E** o role for `admin`.
- Lista fica em `src/lib/super-admins.ts` (constante exportada). Fácil de adicionar/remover email no futuro.
- Rotas protegidas no `App.tsx` ganham um wrapper `<SuperAdminRoute>` (igual ao `ProtectedRoute`, mas valida email também).
- **Telas movidas para Super Admin only**: `/usuarios`, `/backups`, `/logs` (nova), `/lixeira` (nova).
- Sidebar (`AppSidebar.tsx`): os itens "Usuários", "Backups", "Logs" e "Lixeira" só aparecem se `isSuperAdmin === true`. Para outros admins, simplesmente somem do menu.

### 2. Tela de Logs de Auditoria — `/logs`

Hoje a tabela `audit_log` já existe e é populada automaticamente pelos triggers `audit_carregamentos` e `audit_movimentacoes` (ambos gravam quem fez, quando, o que mudou — `de → para`). Os dados já estão lá; falta uma **tela central** para você ver tudo.

Nova página `src/pages/Logs.tsx` com:
- **Filtros**: período (data início/fim — default últimos 7 dias), tipo de entidade (Carregamento / Movimentação Portaria / Backup), ação (criado / alterado / excluído / restore / wipe_orders), usuário (email — autocomplete), busca livre (placa, pedido, cliente).
- **Tabela** ordenada por data desc, paginada de 100 em 100:
  - Data/hora · Usuário · Ação (badge colorido) · Entidade · ID · Resumo das mudanças.
- **Linha expansível** mostrando o JSON `changes` formatado bonito (campo: de → para), reaproveitando o componente `AuditTimeline` que já existe.
- **Exportar CSV** dos logs filtrados (botão no topo) — útil pra auditoria externa / arquivo.
- **KPIs no topo**: Total de eventos no período, Exclusões, Usuários ativos, Top 5 usuários por volume de alterações (para você identificar de cara quem está mexendo demais).

### 3. Tela de Lixeira — `/lixeira` (recuperação de itens apagados)

A tabela `audit_log` já guarda **todos os DELETEs** com snapshot dos dados (`changes.excluido`). Mas hoje só guarda **resumo** (pedido, produto, cliente para carregamentos; tipo, placa para movimentações). Para conseguir **restaurar** preciso do registro completo.

**Mudança nos triggers** (uma migração):
- `audit_carregamentos`: ao deletar, gravar `changes.deleted_row = to_jsonb(OLD)` (registro inteiro, não só resumo).
- `audit_movimentacoes`: idem.
- Adicionar trigger `audit_clientes`, `audit_produtos`, `audit_motoristas`, `audit_caminhoes`, `audit_vendedores`, `audit_veiculos_esperados` — hoje **essas tabelas não têm log nenhum**. Sem isso, se alguém apagar um cliente ou caminhão, some sem rastro. Os triggers vão ser cópia simplificada do `audit_movimentacoes`.

Página `src/pages/Lixeira.tsx`:
- Lista todos os eventos `action = 'excluido'` da `audit_log`.
- Filtro por entidade (Carregamento, Cliente, Produto, Motorista, Caminhão, Vendedor, Movimentação Portaria, Veículo Esperado), por usuário e por período.
- Cada item mostra: o que era (resumo legível), quem apagou, quando, e botão **"Restaurar"**.
- **Restaurar** → edge function `restore-deleted` (nova): valida super admin, lê `changes.deleted_row` do log, faz `INSERT` de volta na tabela original (com o ID antigo, se ainda livre — senão gera novo). Grava no próprio `audit_log` um evento `action = 'restaurado'` com referência ao log original.
- Dialog de confirmação antes do restore.

### 4. Mudanças concretas (resumo)

**Backend:**
- ➕ Migration: triggers `audit_*` para clientes, produtos, motoristas, caminhoes, vendedores, veiculos_esperados.
- ✏️ Migration: ajustar `audit_carregamentos` e `audit_movimentacoes` para gravar `deleted_row = to_jsonb(OLD)` no DELETE.
- ➕ Edge function `restore-deleted`: valida super admin por email, restaura registro do log.

**Frontend:**
- ➕ `src/lib/super-admins.ts` — lista de emails super admin.
- ➕ `src/hooks/useSuperAdmin.ts` — hook que valida email + role.
- ➕ `src/components/SuperAdminRoute.tsx` — wrapper de rota.
- ➕ `src/pages/Logs.tsx` — tela de auditoria completa (filtros, KPIs, tabela expansível, export CSV).
- ➕ `src/pages/Lixeira.tsx` — tela de itens apagados com restore.
- ✏️ `src/App.tsx` — registrar rotas `/logs` e `/lixeira` com `SuperAdminRoute`. Trocar `<ProtectedRoute>` de `/usuarios` e `/backups` para `<SuperAdminRoute>`.
- ✏️ `src/components/AppSidebar.tsx` — esconder Usuários/Backups/Logs/Lixeira para não-super-admins; mostrar os 4 num grupo "Super Admin" no final do menu.

### O que NÃO vai mudar

- Outros admins continuam acessando todo o operacional (Painel, Consolidado, Rupturas, Analytics, Relatórios, Portaria, Cadastros). Só perdem Usuários e Backups.
- Os logs já existentes continuam válidos — a tela só consolida e expõe o que já está no banco.
- Nenhum dado é apagado/movido. Tudo aditivo.

### Observação importante

A lista de super admins fica **no código**, não no banco. Vantagem: ninguém com acesso ao DB consegue se auto-promover a super admin sem subir um deploy. Desvantagem: trocar email exige editar o código. Para 2 emails fixos é o trade-off correto — se um dia quiser virar uma tabela `super_admins` com RLS, a gente migra depois.

