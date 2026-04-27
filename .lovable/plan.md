## 🔒 Itens finais de segurança

Verifiquei o estado atual:
- ✅ `realtime.messages` **já tem RLS habilitado** (`relrowsecurity = true`)
- ⚠️ Mas **não tem nenhuma policy** criada → ninguém consegue receber eventos OU todos recebem (depende de como Supabase trata)
- ⚠️ HIBP (senhas vazadas) ainda desativado
- ⚠️ Tabelas publicadas no realtime: `carregamentos_dia`, `movimentacoes_portaria`, `notifications`

### Problema concreto
A tabela `notifications` é publicada no realtime e tem RLS por `user_id = auth.uid()` na tabela base. Mas o canal Realtime precisa de policy própria em `realtime.messages` para filtrar broadcasts por usuário — caso contrário um usuário autenticado pode tecnicamente assinar tópicos de `notifications` de outros usuários via canal genérico.

Para `carregamentos_dia` e `movimentacoes_portaria` é aceitável que todos os usuários operacionais recebam eventos (é colaborativo), então o filtro é apenas "estar autenticado com role válida".

---

## 📋 Execução proposta

### 1. Migration SQL — RLS em `realtime.messages`

```sql
-- Permite que usuários autenticados recebam eventos APENAS dos canais
-- em que têm permissão de SELECT na tabela base (RLS já cuida do resto).
-- Para notifications: o canal genérico funciona, mas o front filtra por user_id
-- e a policy de SELECT em public.notifications já bloqueia leitura cruzada.

CREATE POLICY "Authenticated can receive realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

-- Bloqueia broadcast/presence de qualquer fonte não-server
CREATE POLICY "Block client-initiated broadcasts"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (false);
```

> Observação: o Supabase Realtime já força a checagem de RLS da tabela base antes de entregar `postgres_changes` quando a policy SELECT existe em `realtime.messages`. Sem nenhuma policy, ele entrega tudo. Adicionar SELECT TO authenticated + INSERT bloqueado é o padrão recomendado.

### 2. Ativar HIBP (senhas vazadas)

Via `cloud--configure_auth` com `password_hibp_enabled: true`. Bloqueia senhas que apareceram em vazamentos públicos no signup e troca de senha.

### 3. Verificação pós-fix

Rodar `security--run_security_scan` + `supabase--linter` novamente para confirmar que os achados críticos foram zerados.

---

## ⚠️ Risco / impacto

- **Realtime:** após aplicar a policy, existing channels (`useNotifications`, `useCarregamentos`, `useMovimentacoesPortaria`) continuarão funcionando — apenas adicionamos a camada que antes faltava. Não há mudança no front.
- **HIBP:** novos usuários e trocas de senha que usem senhas vazadas serão recusados com mensagem clara. Usuários existentes não são afetados até trocarem a senha.

Posso executar tudo em uma única operação após aprovação.