# 🔒 Auditoria Completa de Segurança e Qualidade

Varredura realizada em: scanners automáticos (security scan + DB linter), 172 arquivos do front-end, 8 edge functions, todas as RLS policies, storage e triggers.

## 📊 Resumo Executivo

| Severidade | Quantidade | Status |
|---|---|---|
| 🔴 **Crítico** | 4 | Ação imediata |
| 🟡 **Médio** | 4 | Recomendado |
| 🟢 **Baixo / informativo** | 3 | Opcional |

**Boas notícias:** nenhum `eval`, nenhum `dangerouslySetInnerHTML` com input do usuário, sem credenciais hardcoded, sem armazenamento de senha em localStorage, RLS habilitada em todas as tabelas, edge functions críticas (`backup-snapshot`, `parse-pedido-pdf`, `enrich-clientes-viacep`, `create-user`) já validam JWT no código. Audit log + triggers de notificação funcionando.

---

## 🔴 Críticos — corrigir agora

### 1. `portal_tokens` legível por **qualquer pessoa anônima**
Política `Public select portal_tokens` permite `SELECT` para `anon` + `authenticated` com `USING (true)`. Qualquer um na internet pode listar **todos os tokens, placas, motoristas e cargas**.

**Fix:** restringir SELECT para validar pelo próprio token (lookup por bearer) ou só `authenticated` com role.

### 2. Edge functions `ocr-portaria` e `roteirizar` **abertas ao público**
Têm `verify_jwt = false` no `config.toml` E **não validam JWT no código**. Qualquer um pode chamar (consumir crédito Plate Recognizer, ORS, Lovable AI). Risco financeiro.

**Fix:** adicionar `auth.getUser()` validando token + role no início de ambas, igual `backup-snapshot` faz.

### 3. Tabela `motoristas` — CPF e telefone expostos a todos os autenticados
Política `Authenticated select motoristas` com `USING (true)`. Qualquer usuário (ex.: portaria) lê CPF, telefone, foto-documento de todos os motoristas. Violação de LGPD.

**Fix:** restringir SELECT a `admin / logistica / portaria` via `has_role()` (excluir `faturamento`).

### 4. Realtime sem RLS em `realtime.messages`
Tabelas publicadas (`carregamentos_dia`, `movimentacoes_portaria`, `notifications`) podem ser assinadas por qualquer autenticado em qualquer canal — recebem eventos de **outros usuários** (notificações pessoais incluídas).

**Fix:** criar política em `realtime.messages` filtrando por `auth.uid()` no topic / role.

---

## 🟡 Médios

### 5. Bucket `portaria` — upload sem restrição de role
Política INSERT em `storage.objects` checa apenas `bucket_id='portaria'`. Qualquer autenticado (inclusive futuros perfis) pode subir arquivo arbitrário.
**Fix:** adicionar `has_role(...) IN (admin, logistica, portaria)` no WITH CHECK.

### 6. Leaked Password Protection (HIBP) desativado
Senhas comprometidas vazadas (Have I Been Pwned) são aceitas no signup/troca.
**Fix:** ativar via `configure_auth`.

### 7. Tabelas com SELECT `USING (true)` para `authenticated` (revisão de superfície)
`app_settings`, `caminhoes`, `carregamentos_dia`, `clientes`, `produtos`, `vendedores`, `tipos_caminhao`, `route_templates`, `veiculos_esperados`, `cep_cache`, `route_cache`, `geocode_cache`.

Para a maioria está ok (todos os perfis precisam ler), **mas** `app_settings` pode conter chaves operacionais sensíveis e `clientes` (32 mil registros com endereços) deveria ser limitada a roles operacionais, não `portaria`.
**Fix proposto:** restringir `app_settings` e `clientes` a `admin/logistica/faturamento`.

### 8. `cep_cache` / `route_cache` permitem INSERT/UPDATE de qualquer autenticado com `WITH CHECK (true)`
Baixo risco (cache benigno) mas permite poluição.
**Fix:** restringir a edge functions (service role) ou roles operacionais.

---

## 🟢 Baixos / informativos

- **9.** `chart.tsx` usa `dangerouslySetInnerHTML` — **falso positivo**, é o componente shadcn padrão gerando CSS a partir de config interna. Sem ação.
- **10.** 13 `console.log/error/warn` espalhados em src/ — aceitável para diagnóstico, mas pode-se remover em build produção.
- **11.** Uso de `any` em 8 lugares de edge functions — débito técnico menor, não compromete segurança.

---

## 📋 Plano de execução proposto

Vou aplicar **uma migration única** + ajustes de código, na seguinte ordem:

1. **Migration SQL** corrigindo policies:
   - `portal_tokens`: SELECT apenas se `token = current_setting('request.headers')::json->>'x-portal-token'` ou só authenticated
   - `motoristas`: SELECT restrito a admin/logistica/portaria
   - `clientes` + `app_settings`: SELECT restrito a admin/logistica/faturamento
   - `storage.objects` (portaria): INSERT com check de role
   - `cep_cache` + `route_cache`: INSERT/UPDATE apenas service_role
   - RLS em `realtime.messages` filtrando por user_id no payload

2. **Edge Functions** — adicionar `auth.getUser()` no topo de:
   - `supabase/functions/ocr-portaria/index.ts`
   - `supabase/functions/roteirizar/index.ts`

3. **Auth config** — ativar `password_hibp_enabled = true`

4. **Verificação pós-fix** — rodar novamente `security_scan` + `linter` para confirmar zero findings críticos.

⚠️ **Item #1 (portal_tokens)** vai exigir ajustar `usePortalToken.ts` no front para passar o token via header ou consulta `.eq("token", X)` antes da policy bloquear — vou tratar isso no mesmo passo.

⚠️ **Item #3 (motoristas)** pode quebrar telas que listam motoristas para `faturamento` — verificarei se algum hook faz isso e ajustarei.

Após aprovação, executo tudo de uma vez e te entrego um relatório de "antes/depois" com nova varredura limpa.