

# Sincronizar dados de clientes no painel após atualização

## Problema
O painel lê `cliente`, `cidade` e `uf` diretamente das linhas de `carregamentos_dia`. Quando você atualiza um cliente na página Clientes, os pedidos existentes continuam com os dados antigos porque são campos duplicados (desnormalizados).

## Solução
Ao atualizar um cliente, propagar automaticamente as alterações (nome, cidade, UF) para todos os registros de `carregamentos_dia` que usam o mesmo `codigo_cliente`.

## Mudanças

### 1. `src/hooks/useClientes.ts` — `useUpdateCliente`
Após o update do cliente, executar um update em cascata:
```sql
UPDATE carregamentos_dia 
SET cliente = novo_nome, cidade = nova_cidade, uf = novo_uf
WHERE codigo_cliente = codigo_do_cliente
```
Isso garante que todos os pedidos (passados e futuros) reflitam os dados atualizados.

### 2. Invalidar queries do painel
Após a propagação, invalidar também a query `["carregamentos"]` para que o painel recarregue os dados atualizados.

## Arquivos afetados
- `src/hooks/useClientes.ts` — adicionar propagação no `useUpdateCliente`

