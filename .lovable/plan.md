## Problema

Pedidos com vários produtos para o mesmo cliente (ex.: DMA DISTRIBUIDORA, CEARA ALIMENTOS) estão sendo gravados com **um numero_pedido diferente para cada produto**. Resultado: um pedido único vira N "pedidos" no dashboard, prejudicando visualização e fechamento de carga.

Exemplo confirmado no banco — CEARA ALIMENTOS com 13 produtos no mesmo `created_at` recebeu números 45 a 57 (um por linha).

## Causa raiz

Na auditoria anterior foi criada a trigger `set_numero_pedido` (BEFORE INSERT) que chama `next_numero_pedido(NEW.data) = MAX(numero_pedido)+1` quando `numero_pedido IS NULL`. Como o trigger roda **por linha**, cada produto inserido vê o MAX já incrementado pela linha anterior e recebe um número novo. O frontend nunca preenche `numero_pedido` na criação (deixa null), então a trigger atribui sequencial diferente em todos os itens do `_batch`.

## Correção

### 1. Banco — agrupar por operation_id no trigger

Reescrever `public.set_numero_pedido()` para reutilizar o `numero_pedido` de qualquer linha já inserida na mesma operação:

- Se `NEW.numero_pedido` já vier preenchido → manter.
- Senão, se `NEW.operation_id` está setado → procurar `numero_pedido` em `carregamentos_dia` com mesmo `operation_id` e mesma `data`. Se existir, reutilizar.
- Caso contrário → atribuir `next_numero_pedido(NEW.data)`.

Isso torna o agrupamento de pedido consistente: todas as linhas do mesmo `_batch` (já marcadas com o mesmo `operation_id` pelo CarregamentoDialog) compartilham o mesmo número.

### 2. Frontend — garantir operation_id em todo INSERT multi-produto

Auditar e padronizar `operation_id` nos pontos de criação para que o trigger consiga agrupar:

- `CarregamentoDialog.tsx` → já marca `operation_id`/`row_op_key` no `_batch`. OK.
- `useCarregamentos.ts` (createMut) → criação single-row: gerar `operation_id` mesmo numa única linha (inofensivo).
- `useEditarPedidoAprovacao.ts` e `MeusPedidos.tsx` (vendedor) → garantir `operation_id` único por submit do form (compartilhado entre produtos do mesmo pedido).
- `Index.tsx` `handleClone` e fluxo de clone em batch → mesmo `operation_id` para todos os itens clonados.
- `EditarCargaDialog.tsx` / `FechamentoLoteDialog.tsx` → revisar inserts indiretos.

### 3. Backfill dos pedidos quebrados recentes

Para os pedidos já inseridos hoje que ficaram fragmentados (ex.: CEARA ALIMENTOS, possivelmente DMA), unificar `numero_pedido` por agrupamento natural: mesmo `data` + `codigo_cliente` + `created_at` (truncado a segundos) → atribuir o menor `numero_pedido` do grupo a todas as linhas, e renumerar as posições liberadas no fim da sequência da data, sem colidir com pedidos de outros clientes.

A correção de backfill será conservadora:
- Restrita aos últimos 7 dias.
- Só agrupa linhas com mesma `data` + `codigo_cliente` + mesmo `created_at` em janela de 2 segundos (assinatura típica de batch).
- Mantém o menor número como o número final do pedido; descarta os demais (resequenciamento opcional, pode ser pulado para evitar mexer demais).

## Resumo técnico

```text
Trigger atual (causa do bug):
  INSERT linha 1 → numero_pedido = MAX+1 = 45
  INSERT linha 2 → numero_pedido = MAX+1 = 46  ← deveria ser 45
  INSERT linha 3 → numero_pedido = MAX+1 = 47  ← deveria ser 45
  ...

Trigger corrigido:
  INSERT linha 1 (op=X) → não há outra com op=X → numero = 45
  INSERT linha 2 (op=X) → encontra op=X com numero=45 → reutiliza 45
  INSERT linha 3 (op=X) → reutiliza 45
```

## Arquivos / migrações

- `supabase/migrations/<novo>.sql`:
  - Substituir `public.set_numero_pedido()` pela versão que respeita `operation_id`.
  - Backfill UPDATE para unificar `numero_pedido` dos pedidos fragmentados dos últimos 7 dias.
- `src/components/dashboard/CarregamentoDialog.tsx` — confirmar que `operation_id` é incluído também em singletons (já está nos batches).
- `src/hooks/useCarregamentos.ts` — `createMut` deve sempre setar `operation_id` (mesmo single-row).
- `src/hooks/useEditarPedidoAprovacao.ts` — gerar `operation_id` por submit.
- `src/components/vendedor/MeusPedidos.tsx` e `NovoPedidoDialog.tsx` — gerar `operation_id` por submit do vendedor.
- `src/pages/Index.tsx` — `handleClone` e demais fluxos: propagar `operation_id` único por clonagem multi-item.

Sem alterações de RLS, sem novas tabelas.
