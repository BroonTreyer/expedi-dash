

# Apagar todos os pedidos do painel

## O que será feito
Adicionar uma opção "Apagar Todos os Pedidos" na página de Backups (zona de perigo) que limpa apenas a tabela `carregamentos_dia`. Exige digitar "APAGAR TUDO" para confirmar.

## Mudanças

### 1. Edge function `backup-snapshot` — nova action `wipe_orders`
- Recebe `{ action: "wipe_orders" }`
- Deleta todos os registros de `carregamentos_dia` usando service role
- Registra no `audit_log`
- Retorna contagem de registros deletados

### 2. `src/pages/Backups.tsx` — card "Zona de Perigo"
- Novo card vermelho no final da página com botão "Apagar Todos os Pedidos"
- Dialog de confirmação exigindo digitar **"APAGAR TUDO"**
- Mutation chamando a edge function com `action: "wipe_orders"`
- Após sucesso, invalida queries de carregamentos

## Arquivos afetados
- `supabase/functions/backup-snapshot/index.ts` — adicionar handler `wipe_orders`
- `src/pages/Backups.tsx` — adicionar card + dialog de zona de perigo

