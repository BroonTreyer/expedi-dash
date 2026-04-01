

# Rastrear Total de Rupturas Sinalizadas no Mês

## Problema

Atualmente, o campo `ruptura` na tabela `carregamentos_dia` e um booleano. Quando uma ruptura e resolvida (marcada como `false`), ela desaparece dos contadores do Analytics. Nao ha historico de rupturas que foram sinalizadas e depois resolvidas.

## Solucao

### 1. Novo campo `ruptura_sinalizada` na tabela `carregamentos_dia`
- Coluna `boolean NOT NULL DEFAULT false`
- Quando `ruptura` for marcada como `true`, um trigger automaticamente marca `ruptura_sinalizada = true`
- `ruptura_sinalizada` **nunca volta para false** — e o registro permanente de que houve ruptura
- Isso permite saber: "este item teve ruptura em algum momento" vs "este item tem ruptura agora"

### 2. Trigger para marcar automaticamente
- Trigger `BEFORE UPDATE` que detecta quando `ruptura` muda para `true` e seta `ruptura_sinalizada = true`
- Tambem seta na insercao se `ruptura = true`

### 3. Backfill dos dados existentes
- `UPDATE carregamentos_dia SET ruptura_sinalizada = true WHERE ruptura = true` — marca os que estao com ruptura ativa agora

### 4. Atualizar o hook `useAnalytics.ts`
- Adicionar `ruptura_sinalizada` na query
- Criar novo KPI: "Total Sinalizadas" (conta `ruptura_sinalizada = true`)
- Manter KPI existente "Rupturas Ativas" (conta `ruptura = true`)
- Na tab Rupturas, mostrar ambos os numeros

### 5. Atualizar Analytics UI
- Adicionar KPI "Sinalizadas no Periodo" ao lado dos existentes
- Adicionar coluna/indicador nos rankings de produtos mostrando quantas foram sinalizadas vs quantas ainda estao ativas

## Detalhes Tecnicos

| Arquivo/Recurso | Mudanca |
|---|---|
| Migration SQL | Adicionar coluna `ruptura_sinalizada`, trigger, backfill |
| `src/hooks/useAnalytics.ts` | Incluir `ruptura_sinalizada` na query, calcular KPIs separados |
| `src/pages/Analytics.tsx` | Exibir KPI "Sinalizadas" na tab Rupturas |

