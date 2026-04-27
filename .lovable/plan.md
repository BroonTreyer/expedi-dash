
# Separar pedidos distintos do mesmo cliente

## Diagnóstico

Sim, o agrupamento está acontecendo, e identifiquei a causa olhando o banco de dados.

A lógica de agrupamento em `CarregamentoTable.tsx` (`buildGroups`) faz:

- Se o registro tem `numero_pedido` preenchido → agrupa por `codigo_cliente + numero_pedido` (separa corretamente).
- Se `numero_pedido` está vazio → cai no fallback: agrupa por `codigo_cliente + data` (junta tudo do mesmo cliente no mesmo dia).

Consultando os registros de hoje, **todos os pedidos novos têm `numero_pedido = NULL`**. Ou seja, o campo não está sendo preenchido no formulário de criação, e por isso dois "pedidos diferentes" do mesmo cliente acabam sendo identificados como o mesmo grupo.

## Solução

Mudar o fallback de agrupamento para que, quando `numero_pedido` for nulo, cada lançamento em momentos distintos seja tratado como um pedido separado — em vez de agrupar tudo do cliente no dia.

### Alteração

`src/components/dashboard/CarregamentoTable.tsx` — função `buildGroups` (linhas 101-121):

Trocar o fallback `${codigo_cliente}__d${data}` por uma chave baseada no instante de criação compartilhado pelos itens criados juntos. Pedidos cadastrados na mesma "leva" (multi-produto) compartilham o mesmo `created_at` ao milissegundo (visível na consulta: vários itens com `created_at = 2026-04-27 12:24:29.493623`); pedidos lançados em momentos diferentes terão `created_at` distintos.

Nova lógica:

```ts
const key = c.numero_pedido != null
  ? `${c.codigo_cliente}__p${c.numero_pedido}`
  : `${c.codigo_cliente}__t${c.created_at}`;
```

### Resultado

- Pedido com `numero_pedido` preenchido: continua agrupando por cliente+pedido (inalterado).
- Pedido sem `numero_pedido` cadastrado de uma vez (múltiplos produtos no mesmo dialog): agrupado corretamente como um pedido só (mesmo `created_at`).
- Dois pedidos distintos do mesmo cliente, lançados em momentos diferentes: aparecem como pedidos separados na tabela.

### Observação

Essa correção resolve o sintoma. A causa raiz é que o `numero_pedido` não está sendo capturado no cadastro — se quiser, em uma próxima iteração podemos tornar esse campo mais visível ou obrigatório no `CarregamentoDialog`.
