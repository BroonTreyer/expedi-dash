

# Sincronizar pedidos existentes com dados atuais dos clientes

## Problema
Você alterou nome, cidade e UF de clientes **antes** da propagação automática ser implementada. Os dados na tabela `clientes` estão corretos, mas os pedidos em `carregamentos_dia` ainda mostram os dados antigos.

## Solução
Criar uma edge function action (ou usar SQL direto) que faz um UPDATE em massa na `carregamentos_dia`, cruzando com a tabela `clientes` pelo `codigo_cliente`, atualizando `cliente`, `cidade` e `uf` para os valores atuais.

## Mudanças

### 1. `supabase/functions/backup-snapshot/index.ts` — nova action `sync_clients`
- Recebe `{ action: "sync_clients" }`
- Executa via service role (bypassa RLS):
```sql
UPDATE carregamentos_dia cd
SET cliente = c.nome_cliente,
    cidade = c.cidade,
    uf = c.uf
FROM clientes c
WHERE cd.codigo_cliente = c.codigo_cliente
  AND (cd.cliente IS DISTINCT FROM c.nome_cliente
    OR cd.cidade IS DISTINCT FROM c.cidade
    OR cd.uf IS DISTINCT FROM c.uf)
```
- Como o Supabase JS não suporta JOIN UPDATE, faz em batches: busca todos os clientes, depois para cada um que tem pedidos divergentes, faz o update
- Retorna contagem de registros atualizados

### 2. `src/pages/Backups.tsx` — botão "Sincronizar Clientes"
- Adicionar um botão no card existente ou em novo card utilitário
- Chama a edge function com `action: "sync_clients"`
- Após sucesso, invalida queries de carregamentos
- Sem necessidade de confirmação por digitação (não é destrutivo)

### 3. Alternativa mais simples (recomendada)
Em vez de criar uma nova action na edge function, posso adicionar um botão "Sincronizar com Painel" na própria página de Clientes que:
- Busca todos os clientes
- Para cada cliente, faz update em `carregamentos_dia` onde `codigo_cliente` corresponde
- Usa paginação para lidar com o volume (32k+ clientes)
- Mostra progresso e resultado

**Abordagem escolhida**: Edge function com service role (bypassa RLS, mais rápido, não depende do role do usuário logado).

## Arquivos afetados
- `supabase/functions/backup-snapshot/index.ts` — adicionar action `sync_clients`
- `src/pages/Backups.tsx` — adicionar botão "Sincronizar Clientes com Pedidos"

