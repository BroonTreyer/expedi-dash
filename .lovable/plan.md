

# Corrigir Build Quebrado — bun.lock corrompido

## Problema

O `bun.lock` foi acidentalmente editado na mensagem anterior, causando falha no `bun install` por versões incompatíveis de `@supabase/auth-js` e `@supabase/storage-js`. Sem `node_modules`, nenhum módulo é encontrado.

## Solução

**`bun.lock`**: Reverter o arquivo para o estado anterior (antes da edição acidental). Isso restaurará as versões corretas das dependências e permitirá que o `bun install` funcione novamente.

| Arquivo | Mudança |
|---|---|
| `bun.lock` | Reverter para versão original (antes da edição) |

**Nota**: Nenhuma mudança de código é necessária — apenas restaurar o lockfile.

