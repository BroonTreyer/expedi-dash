

# Auditoria do Sistema — Erros Encontrados

## Estado dos Dados (banco)
- **993 registros** em `carregamentos_dia`, todos com `peso_manual = true` — OK
- **1 registro** com peso = 0 e quantidade > 0 — possível dado incompleto
- **21 registros** com quantidade = 0 mas peso > 0 — possível dado inconsistente
- **0 snapshots** criados — sistema de backup nunca foi usado

## Erros Encontrados

### 1. CRÍTICO — Edge function `backup-snapshot` importa CORS de local inexistente
**Arquivo**: `supabase/functions/backup-snapshot/index.ts`, linha 2
```ts
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
```
Este export não existe. `corsHeaders` será `undefined`, fazendo com que nenhum header CORS seja enviado nas respostas. Isso pode causar erros silenciosos no browser ao chamar a função.

**Correção**: Definir `corsHeaders` manualmente:
```ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

### 2. MODERADO — Edge function `backup-snapshot` usa `getClaims` (não existe no SDK)
**Arquivo**: `supabase/functions/backup-snapshot/index.ts`, linha ~80
```ts
const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
```
O método `getClaims` não existe no Supabase JS SDK v2. Deveria usar `getUser()` para verificar a identidade do usuário.

**Correção**: Substituir por `auth.getUser()`:
```ts
const { data: { user }, error } = await userClient.auth.getUser();
const userId = user?.id;
```

### 3. MENOR — Console warning: ForwardRef no AuditTimeline
O console mostra "Function components cannot be given refs" referente a `AuditTimeline`. O componente usa `Sheet` (não `Dialog`), então esse warning pode ser de uma versão anterior em cache. Verificar se persiste após limpar cache.

### 4. MENOR — Segurança: Leaked password protection desativada
O linter do banco detectou que a proteção contra senhas vazadas está desativada. Recomendação: ativar nas configurações de autenticação.

### 5. INFO — Nenhum snapshot de backup foi criado
O sistema de backup está implementado mas nunca foi usado. Recomendação urgente: criar um snapshot agora.

## Plano de Correção

### Arquivo: `supabase/functions/backup-snapshot/index.ts`
1. Remover a linha `import { corsHeaders }` e definir `corsHeaders` como constante local
2. Substituir `auth.getClaims(token)` por `auth.getUser()` para validação de usuário
3. Re-deploy da edge function

### Segurança
4. Ativar leaked password protection via configuração de autenticação

### Arquivos afetados
- `supabase/functions/backup-snapshot/index.ts` — 2 correções

