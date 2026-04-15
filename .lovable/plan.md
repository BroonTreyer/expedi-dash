

## Correção: campo `numero_pedido` ausente na query do período atual

### Problema
Na query principal do `useAnalytics.ts` (linha 115), o `select` do período atual não inclui `numero_pedido`. O campo só é buscado na query do período anterior. Como resultado, o cálculo de pedidos únicos retorna 0 de 0, e a Taxa de Ruptura aparece como **0%** com **"0 de 0 pedidos"**.

### Correção
Adicionar `numero_pedido` ao `select` da query do período atual.

**Arquivo:** `src/hooks/useAnalytics.ts`

**Linha 115 — de:**
```
.select("data, peso, status, vendedor_id, ruptura, ruptura_sinalizada, uf, tipo_caminhao, nome_produto, vendedores(nome_vendedor)")
```

**Para:**
```
.select("data, peso, status, vendedor_id, ruptura, ruptura_sinalizada, uf, tipo_caminhao, nome_produto, numero_pedido, vendedores(nome_vendedor)")
```

Uma única linha a alterar. Após isso, o KPI mostrará corretamente a taxa de ruptura por pedido único com o subtítulo detalhado.

