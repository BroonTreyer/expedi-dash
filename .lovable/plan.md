
## Diagnóstico

Hoje o sync usa apenas `clientes.cidade` para preencher `carregamentos_dia.cidade`. Se o cadastro do cliente tem `cidade` errado/vazio mas tem CEP, a sincronização ainda propaga o valor errado (ou vazio). A solução: usar **ViaCEP** para enriquecer `clientes.cidade`/`uf` a partir do CEP, e depois rodar o sync já existente.

## Plano

### 1. Edge function `enrich-clientes-viacep`
Nova function que:
- Lê todos os `clientes` com `cep` válido (8 dígitos)
- Agrupa por CEP único (deduplica para minimizar chamadas)
- Para cada CEP, chama `https://viacep.com.br/ws/{cep}/json/` (público, sem key)
- Processa em lotes paralelos (ex: 20 simultâneos) com pequeno delay para não estourar rate-limit
- Atualiza `clientes.cidade` (= `localidade` do ViaCEP) e `clientes.uf` quando o CEP é válido
- Retorna `{ processed, updated, errors }`

Usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS, valida JWT do chamador via `auth.getUser()` (padrão das outras functions).

### 2. Botão "Atualizar via CEP" em `Clientes.tsx`
Novo botão no header (ao lado de "Sincronizar pedidos") que:
1. Chama `supabase.functions.invoke("enrich-clientes-viacep")`
2. Em seguida chama `rpc("sync_clients_to_orders")` para propagar para os pedidos
3. Mostra toast: "X clientes atualizados via ViaCEP. Y pedidos sincronizados."
4. Invalida queries de `clientes` e `carregamentos`

### 3. Auto-disparar no importador
Em `handleImport`, após o upsert e antes do `sync_clients_to_orders`, chamar a function de enriquecimento. Assim toda nova base importada é normalizada automaticamente.

### Sem mudanças
- Schema, RLS, função `sync_clients_to_orders`, hooks de cliente

## Arquivos
- 🆕 `supabase/functions/enrich-clientes-viacep/index.ts` — fetch ViaCEP + update em lote
- ✏️ `src/pages/Clientes.tsx` — novo botão + chamar enrich antes do sync no import
