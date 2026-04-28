## Diagnóstico definitivo

Achei a causa real olhando os logs do Postgres. O erro `duplicate key value violates unique constraint "carregamentos_dia_row_op_key_unique"` está vindo em **rajadas** (vários por milissegundo) e também está vindo um irmão dele: `carregamentos_dia_operation_unique`.

### As duas constraints únicas em jogo

```sql
carregamentos_dia_row_op_key_unique  ON (row_op_key)               WHERE row_op_key IS NOT NULL
carregamentos_dia_operation_unique   ON (operation_id, codigo_produto)  WHERE operation_id IS NOT NULL
```

### O cenário que quebra

Quando você abre um pedido para **editar e marcar ruptura**:

1. O dialog abre em modo `editingGroup` (pedido com múltiplos itens, vindos via `cloneItems`).
2. Os itens existentes têm `originalId` setado → vão para `batchUpdates` (UPDATE).
3. Qualquer item **sem** `originalId` (linha que foi adicionada na UI ou que veio sem id rastreado) vai para `batchInserts` com:
   - `operation_id: opId` (o opId NOVO desta sessão do dialog)
   - `row_op_key: ${opId}__${attemptSuffix}__${codigo_produto}__${i+1}`

4. **Se houver dois itens com o mesmo `codigo_produto`** no batch (super comum: o mesmo produto repetido em duas quantidades, ou o mesmo SKU adicionado duas vezes), a constraint `(operation_id, codigo_produto)` é violada — o índice único exige a tupla distinta dentro de uma mesma operação.

5. O `batchCreateMut` em `useBatchCreateCarregamento` chama `.insert(payload).select()` em **um único request**. Quando dá erro `23505`, o hook silencia (retorna `[]`) — mas a transação inteira é abortada pelo PostgreSQL, e o cascade subsequente também falha em cadeia, gerando as rajadas que aparecem nos logs.

### Por que a correção anterior não pegou

A correção anterior (regenerar `opId` após erro + sufixo por tentativa) protege contra colisões **entre tentativas diferentes** do usuário. Mas o problema atual é colisão **dentro da mesma tentativa**, entre linhas irmãs que compartilham o mesmo `codigo_produto`.

A constraint `carregamentos_dia_operation_unique` foi criada (em uma migration de 28/04) com a intenção de bloquear "mesmo operation_id + mesmo produto = duplicata". Mas ela é incompatível com o caso legítimo de **um pedido ter o mesmo produto duas vezes** (ex: 2 caixas de Pão de Alho em quantidades distintas, ou ruptura parcial que vira duas linhas).

## Correção

Duas mudanças, uma no banco e uma no front:

### 1. Migration: relaxar a constraint `operation_unique`

A constraint `(operation_id, codigo_produto)` é boa demais. Substituir por `(row_op_key)` apenas (que já existe). A `row_op_key` já carrega o índice da linha (`__0`, `__1`, …), então duas linhas com o mesmo produto têm chaves diferentes naturalmente.

```sql
DROP INDEX IF EXISTS public.carregamentos_dia_operation_unique;
-- mantém apenas carregamentos_dia_row_op_key_unique e o índice não-único de operation_id
```

A proteção contra duplo-clique fica garantida por `row_op_key`, que já inclui `operation_id__attemptSuffix__codigo__idx`.

### 2. Front (`CarregamentoDialog.tsx`): garantir índices globais únicos no batch

Hoje o `makeRowKey` usa `idx` que é o índice **dentro do slice atual** (extraRows usa `i+1`, primeira linha usa `i`). Quando o dialog tem 2 produtos iguais, ambos podem cair em índices diferentes — ok. Mas para reforçar e evitar regressões, vou usar um contador monótono dentro de cada `handleSubmit`:

```ts
let rowCounter = 0;
const makeRowKey = (item: ProductItem) =>
  `${opId}__${attemptSuffix}__${item.codigo_produto || "x"}__${rowCounter++}`;
```

E remover o parâmetro `idx` das chamadas (passa a ser um contador global do submit, não índice de array).

### 3. Front (`useCarregamentos.ts`): tratar 23505 também no `batchUpdate`

Já tratei isso para `useCreate` e `useBatchCreate`, mas o `useBatchUpdateCarregamento` faz `Promise.all(...update().single())` e se uma falhar com `23505` o erro vaza. Vou filtrar `23505` como sucesso silencioso lá também (caso muito raro mas possível em race com realtime).

## Arquivos alterados

- `supabase/migrations/<timestamp>_drop_operation_unique.sql` — drop do índice problemático
- `src/components/dashboard/CarregamentoDialog.tsx` — contador global no `makeRowKey`
- `src/hooks/useCarregamentos.ts` — filtrar 23505 no `useBatchUpdateCarregamento`

## O que NÃO muda

- A proteção contra duplicatas continua via `carregamentos_dia_row_op_key_unique` (que combina opId + attemptSuffix + idx).
- Nenhuma mudança no fluxo de sales/logistica/portaria.
- Nenhuma mudança em RLS ou triggers.
- A migration é segura: drop de índice único não afeta dados existentes (os valores continuam lá, só não são mais checados como tupla).

## Verificação após aplicar

Editar um pedido com 2 itens do mesmo produto (Pão de Alho duplicado) e marcar ruptura → deve salvar sem erro.

Pode aplicar?