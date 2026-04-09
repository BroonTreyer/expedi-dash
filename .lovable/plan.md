
# Corrigir erro “Failed to send a request to the Edge Function” no sincronizar clientes

## O que o código mostra
O botão existe e está renderizado em `src/pages/Backups.tsx`, então o problema não é “botão sumiu”.
O erro da imagem indica falha na chamada HTTP da função, antes mesmo da lógica `sync_clients` terminar.

## Causa mais provável
A função `backup-snapshot` usa CORS mais restrito que outras funções que já funcionam:

- `backup-snapshot` aceita só:
  - `authorization, x-client-info, apikey, content-type`
- funções como `roteirizar` e `ocr-portaria` aceitam também:
  - `x-supabase-client-platform`
  - `x-supabase-client-platform-version`
  - `x-supabase-client-runtime`
  - `x-supabase-client-runtime-version`

Como `supabase.functions.invoke()` pode enviar esses headers extras, o navegador bloqueia a requisição no preflight e aparece exatamente esse toast genérico.

## Plano de correção

### 1. Ajustar CORS da função `backup-snapshot`
Arquivo: `supabase/functions/backup-snapshot/index.ts`

- Trocar o `corsHeaders` atual pelo mesmo padrão já usado nas funções que funcionam
- Garantir que `OPTIONS` continue respondendo com esses headers
- Garantir que todas as respostas de erro e sucesso continuem incluindo os mesmos headers

### 2. Fortalecer o tratamento de erro no front
Arquivo: `src/pages/Backups.tsx`

- Melhorar o `onError` de `syncClientsMutation`
- Se a chamada falhar no transporte, mostrar mensagem mais clara do tipo:
  - “Não foi possível chamar a rotina de sincronização”
  - “Se o problema persistir, verifique permissões/CORS da função”
- Manter `invalidateQueries(["carregamentos"])` no sucesso

### 3. Revisar a robustez da action `sync_clients`
Arquivo: `supabase/functions/backup-snapshot/index.ts`

Já que vamos tocar na função, aproveito para endurecer a rotina:
- evitar `.or(...)` com valores de cliente/cidade/UF potencialmente nulos ou com caracteres especiais
- preferir update direto por `codigo_cliente` ou comparação mais segura no servidor
- capturar e retornar erro detalhado por lote/cliente quando algo falhar

Isso reduz risco de a função “rodar” mas falhar em casos específicos.

### 4. Confirmar acesso admin
Pelo código atual:
- rota `/backups` é só para `admin`
- item do menu “Backups” também é só para `admin`
- a função também valida `user_roles.role = admin`

Então, se você chegou nessa tela, o problema mais provável não é permissão de página, e sim a chamada da função.

## Resultado esperado
Depois da correção:
- o botão “Sincronizar Clientes com Pedidos” continua aparecendo
- a chamada da função deixa de falhar no navegador
- a sincronização passa a executar normalmente
- se algo interno falhar, a mensagem de erro fica clara em vez de toast genérico

## Arquivos afetados
- `supabase/functions/backup-snapshot/index.ts`
- `src/pages/Backups.tsx`

## Detalhe técnico
```text
Sintoma:
  Failed to send a request to the Edge Function

Leitura mais provável:
  falha de preflight/CORS antes da execução real

Evidência no código:
  backup-snapshot tem Access-Control-Allow-Headers menor
  que outras funções do mesmo projeto que seguem o padrão completo
```
