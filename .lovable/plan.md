

# Backup e Restore de Dados — Server-side Snapshots

## O que será construído

Um sistema de snapshots completos dos dados, armazenados no próprio banco, com capacidade de restaurar qualquer snapshot anterior. Acessível por uma nova página "Backups" no menu lateral, restrita a admins.

## Como funciona

```text
[Admin clica "Criar Snapshot"] 
       ↓
Edge Function lê todas as tabelas operacionais
       ↓
Grava JSON completo na tabela data_snapshots
       ↓
Lista de snapshots com data/hora e descrição
       ↓
[Admin clica "Restaurar"] → confirma → Edge Function restaura
       ↓
DELETE + INSERT em cada tabela com os dados do snapshot
```

## Mudanças

### 1. Nova tabela `data_snapshots` (migration)
- `id uuid`, `description text`, `created_by uuid`, `created_at timestamptz`
- `snapshot_data jsonb` — contém dump completo de: `carregamentos_dia`, `produtos`, `clientes`, `vendedores`, `motoristas`, `caminhoes`, `movimentacoes_portaria`, `veiculos_esperados`, `tipos_caminhao`
- `record_counts jsonb` — contagem de registros por tabela para exibição rápida
- RLS: somente admin pode SELECT, INSERT, DELETE

### 2. Edge Function `backup-snapshot/index.ts`
Duas ações via POST body `{ action: "create" | "restore", snapshot_id?, description? }`:

**create**: Usa `SUPABASE_SERVICE_ROLE_KEY` para ler todas as tabelas sem limite de 1000 (paginação), monta JSON, insere na `data_snapshots`.

**restore**: Lê o snapshot, para cada tabela faz `DELETE FROM tabela` e `INSERT` com os dados do snapshot, tudo dentro de uma transação SQL para garantir atomicidade. Registra no `audit_log` que um restore foi feito.

### 3. Nova página `src/pages/Backups.tsx`
- Lista de snapshots existentes com data, descrição, contagem de registros
- Botão "Criar Snapshot" com campo de descrição opcional
- Botão "Restaurar" em cada snapshot com dialog de confirmação dupla (digitar "RESTAURAR" para confirmar)
- Somente admin tem acesso

### 4. Rota e sidebar
- `App.tsx`: nova rota `/backups` com `allowedRoles={["admin"]}`
- `AppSidebar.tsx`: item "Backups" com ícone `Database`, role `["admin"]`

## Segurança
- Tabela com RLS restrita a admin
- Edge Function valida JWT e verifica role admin antes de executar
- Restore exige confirmação explícita no frontend
- Cada restore é registrado no audit_log

## Resultado esperado
- Admin pode criar snapshots a qualquer momento como ponto de restauração
- Se algo der errado, pode restaurar todos os dados para o estado exato do snapshot
- Snapshots ficam salvos no banco, não dependem de arquivos externos

