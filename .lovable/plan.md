
## Diagnóstico

Print mostra pedidos onde a coluna "Cidade" está com valores tipo "MIX MATEUS" (nome fantasia) ao invés do nome real da cidade. Isso indica que esses pedidos foram criados/importados com cidade incorreta e **não foram atualizados** quando o cadastro de cliente foi corrigido.

Investigando o código:

1. **`useUpdateCliente`** (linha ~73 de `useClientes.ts`) propaga `cliente`, `cidade` e `uf` para `carregamentos_dia` via `WHERE codigo_cliente = X`. ✅ Funciona se o cliente for editado manualmente.

2. **Importação em massa** (`handleImport` em `Clientes.tsx`) usa `supabase.from("clientes").upsert(...)` direto — **NÃO chama `useUpdateCliente`**, então a propagação para `carregamentos_dia` **NÃO acontece** no upsert da planilha.

3. Existe a função `sync_clients_to_orders()` no banco que faz exatamente essa sincronização global, mas ela **não é chamada em lugar nenhum** após a importação.

**Causa raiz:** quando você importa a base nova de clientes (com cidades corretas), os pedidos antigos em `carregamentos_dia` continuam com a cidade errada (nome fantasia) porque o `upsert` da planilha não dispara a propagação.

## Plano

### 1. Chamar `sync_clients_to_orders` após importação
Em `Clientes.tsx`, ao final de `handleImport` (após o loop de upsert bem-sucedido), chamar `supabase.rpc("sync_clients_to_orders")`. Isso atualiza todos os pedidos cujo `codigo_cliente` bate com algum cliente cadastrado, sincronizando `cliente`, `cidade` e `uf`.

### 2. Mostrar resultado no toast
A função retorna `{ updated: N }`. Exibir: `"X clientes importados. Y pedidos sincronizados."`

### 3. Botão manual de "Sincronizar pedidos"
Adicionar um botão discreto no header da página `Clientes.tsx` (ao lado de "Importar") que chama `sync_clients_to_orders` sob demanda. Útil para corrigir pedidos antigos sem precisar reimportar a planilha.

### Sem mudanças
- Schema, RLS, função `sync_clients_to_orders` (já existe e funciona)
- Hooks `useCreateCliente`/`useUpdateCliente` (já propagam corretamente em edições individuais)
- Importador (apenas adicionar a chamada RPC no fim)

## Arquivos
- ✏️ `src/pages/Clientes.tsx` — chamar `rpc("sync_clients_to_orders")` ao fim de `handleImport` + novo botão "Sincronizar pedidos"
