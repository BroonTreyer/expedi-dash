---
name: Vendedor portal
description: Login dedicado por vendedor (role 'vendedor'), painel restrito em /meu-painel via vendedor_users + RLS
type: feature
---
Cada vendedor pode ter um login próprio (role `vendedor` no enum `app_role`). O vínculo 1:1 fica em `public.vendedor_users (user_id PK, vendedor_id UNIQUE)`. A função `public.get_my_vendedor_id()` (security definer) retorna o vendedor do `auth.uid()`.

RLS: política "Vendedor reads own carregamentos" em `carregamentos_dia` filtra por `vendedor_id = get_my_vendedor_id()`. Vendedor também tem SELECT em `clientes` (policy explícita) e nas tabelas de leitura geral (`produtos`, `vendedores`, `tipos_caminhao`).

Fluxo: Admin cria conta em /usuarios escolhendo role=vendedor + vendedor (dropdown só mostra ativos sem vínculo). A edge function `create-user` envia `vendedor_id` no metadata; o trigger `handle_new_user` cria a entrada em `user_roles` (vendedor) e `vendedor_users`, e a edge function reforça o upsert via service role.

UI: rota `/meu-painel` (lazy, allowedRoles=['vendedor']). Sidebar mostra apenas "Meu Painel" + Sair. Após login o `Auth.tsx` e `ProtectedRoute.tsx` redirecionam role 'vendedor' para `/meu-painel`. Período padrão: últimos 7 dias. Componentes em `src/components/vendedor/`: KpiVendedor, GraficosVendedor (Recharts), CargasAndamentoVendedor (agrupado por etapa), RupturasVendedor (cor #EF5350). Hook `useMeuPainel(dateRange)` em `src/hooks/useMeuPainel.ts` — faz uma query paginada em `carregamentos_dia` no intervalo (RLS já restringe ao vendedor logado).
