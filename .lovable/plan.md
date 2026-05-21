## Problema

Na página **Pré-cargas**, o card da carga **SEPEX / 15-05-2026** mostra apenas **1 pedido** quando na verdade existem **2 pedidos #83** com clientes diferentes:

- **#83 — SE DISTRIBUIDORA** (cód. 11621) — 12 itens, 1 ruptura de 12.000 kg
- **#83 — A M ASSESSORIA** (cód. 33313) — 7 itens

Confirmado no banco (`carregamentos_dia`, etapa `pre_carga`): mesmo `carga_id`, mesma `data`, mesmo `numero_pedido = 83`, `codigo_cliente` diferente.

## Causa

Em `src/pages/PreCargas.tsx`, o agrupamento de itens em pedidos usa **apenas `numero_pedido`** como chave do bucket:

```ts
let p = peds.get(r.numero_pedido);
```

Como o sistema permite (e os dados mostram) dois clientes diferentes com o mesmo número de pedido na mesma carga, eles colapsam em um grupo só. O card exibe um cliente apenas, soma pesos errados e o contador "X pedidos" fica subestimado.

## Correção (somente front-end, escopo mínimo)

Alterar **apenas** `src/pages/PreCargas.tsx`:

1. Trocar a chave do `Map<number, PedidoGrupo>` por `Map<string, PedidoGrupo>` usando uma chave composta:
   ```
   `${numero_pedido}::${codigo_cliente ?? cliente ?? ''}`
   ```
   Isso garante 1 grupo por (pedido, cliente) dentro da mesma carga.

2. Manter `numero_pedido` como campo de exibição do `PedidoGrupo` (sem alteração de tipo).

3. Ajustar a ordenação dos pedidos do card para desempatar pelo nome do cliente quando o `numero_pedido` for igual:
   ```
   carga.pedidos.sort((a,b) =>
     a.numero_pedido - b.numero_pedido ||
     (a.cliente ?? '').localeCompare(b.cliente ?? '')
   );
   ```

4. Verificar/atualizar o export XLSX (`src/lib/pre-cargas-export.ts`) para que as abas **Pedidos** e **Itens** também separem por cliente — se já consomem `carga.pedidos`, ficam corretas automaticamente após o fix.

## Fora de escopo

- Não mudar schema/triggers/RLS.
- Não mexer no PDF (`PreCargaPrintDialog`) a menos que ele também agrupe por `numero_pedido` apenas — verificar após a correção e, se necessário, aplicar a mesma chave composta.
- Não alterar regras de duplicidade de `numero_pedido` no banco — é comportamento aceito hoje.
