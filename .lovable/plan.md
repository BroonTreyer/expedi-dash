## Problema

No card "22191 — CIA ATACADISTA · Pedido 13" o item 2600 (LING SUINA FINA APIMENTADA) está como **ruptura total** com `peso = 7992 kg` e `quantidade = 444`. Porém o `peso_original` no banco continua **12006 kg** (e `quantidade_original = 600`) porque o pedido foi **editado em Aprovações** depois — reduzindo o pedido — sem que o baseline fosse atualizado.

Resultado:
- Tela "Faltando agora" usa `pesoNaoCarregado(c)` → como `ruptura = true`, retorna `peso_original = 12006` → mostra **12.006 kg faltando**.
- O usuário (que editou o pedido para 444 unid / 7992 kg) espera ver **7.992 kg faltando**, pois esse é o tamanho atual do pedido.

Confirmado via consulta no banco:
```
codigo_produto: 2600   peso: 7992   peso_original: 12006
quantidade: 444   quantidade_original: 600
ruptura: true   ruptura_sinalizada: true
```

## Causa

`src/hooks/useEditarPedidoAprovacao.ts` (UPDATE em itens existentes) envia `peso` e `quantidade` novos, mas **nunca envia `peso_original` nem `quantidade_original`**. As triggers do banco preservam o baseline antigo, então qualquer cálculo de ruptura continua referenciando o pedido original (não o pedido editado).

O `CarregamentoDialog` já trata esse caso com o helper `rupturaFieldsForItem` (envia `peso_original = peso` quando o usuário confirma redução / aumento). O fluxo de edição em Aprovações precisa do mesmo tratamento.

## Correção

**Arquivo:** `src/hooks/useEditarPedidoAprovacao.ts`

No bloco `// 2) UPDATE existentes`, incluir no payload:
```ts
peso_original: it.peso,
quantidade_original: it.quantidade,
```

Justificativa: ao editar um pedido em Aprovações, o pedido **é** o novo baseline — o usuário/vendedor está redefinindo a demanda. Replica o mesmo princípio do `CarregamentoDialog` (rebase de baseline em edição direta).

Adicionalmente, para o registro afetado (id `61d06850-…`), ajustar manualmente via migration de dados:
```sql
UPDATE carregamentos_dia
SET peso_original = peso, quantidade_original = quantidade
WHERE id = '61d06850-af2f-457e-834d-4b0d5caf0b94';
```
para que o card já apareça correto (7.992 kg) sem precisar reabrir o pedido.

## Resultado esperado

- Edições em Aprovações passam a redefinir baseline (peso/quantidade originais = novos valores).
- O item 2600 do Pedido 13 mostra **7.992 kg faltando** em "Faltando agora", batendo com o pedido editado.
- Não afeta rupturas parciais registradas pelo `CarregamentoDialog` (que continua com sua própria lógica de baseline).
