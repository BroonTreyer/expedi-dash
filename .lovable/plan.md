

## Diagnóstico

Reli `CarregamentoTable.tsx` linhas 83-99. A chave de agrupamento atual é `${codigo_cliente}__${numero_pedido}` — ou seja:

- Produtos do **mesmo pedido** (mesmo `numero_pedido`) → **agrupam juntos** ✅
- Pedidos **diferentes** do mesmo cliente → ficam separados ✅

Isso é o comportamento que você pediu. Se na sua tela os produtos do mesmo pedido estão aparecendo separados, **o agrupamento não é o culpado** — são os dados que estão divergindo. Causas possíveis:

1. **`numero_pedido` diferente entre os produtos do mesmo pedido** — se logística digitou o pedido em momentos distintos e variou o número (ex: 1234 num produto, 1234.0 noutro, ou um ficou em branco), eles caem em grupos diferentes.
2. **`numero_pedido` NULL em algum item** — itens sem número viram cards individuais (linha 95 → `singles`).
3. **`codigo_cliente` divergente entre as linhas** — mesmo cliente mas códigos diferentes (raro, mas possível em importações).

## Investigação necessária antes de mudar código

Preciso ver um caso concreto que está te incomodando. Duas opções:

### Opção A — você me passa o número do pedido (ou cliente + data)
Eu rodo uma query mostrando os campos `numero_pedido`, `codigo_cliente`, `codigo_produto`, `nome_produto`, `created_at` de todos os itens daquele pedido. Em <30s digo se a divergência está em `numero_pedido`/`codigo_cliente` ou se é bug de UI mesmo.

### Opção B — eu rodo uma varredura geral
Listo todos os pedidos de hoje onde **o mesmo cliente** tem itens com `numero_pedido` muito próximos (ex: mesmo número escrito de formas diferentes) ou com `numero_pedido` NULL convivendo com não-NULL. Identifica padrão sistêmico.

## Plano (após confirmação do diagnóstico)

**Se for caso 1 ou 2 (dados divergentes):**
- Reforçar no `CarregamentoDialog` o preenchimento obrigatório de `numero_pedido` quando o usuário adiciona "+Item" no mesmo pedido (já é obrigatório no form principal, mas validar que itens extras herdam o número automaticamente).
- Migration corrigindo registros históricos com `numero_pedido` NULL ou inconsistente — só após sua aprovação, caso a caso.

**Se for caso 3 (`codigo_cliente` divergente):**
- Mudar a chave de grupo para usar **só `numero_pedido`** quando ele existe (descartar `codigo_cliente` da chave). Pedidos sempre têm número único, então isso é seguro.

**Se na verdade você quer agrupar TUDO do mesmo cliente no mesmo dia (independente de quantos pedidos)** — voltar a chave para só `codigo_cliente` (estado anterior à última mudança). Mas isso conflita com seu pedido anterior de "deixar pedidos separados".

## Sem mudanças por enquanto
Não vou tocar em código sem antes confirmar qual dos 3 casos é o seu, porque o agrupamento atual já está implementando exatamente o que você pediu na rodada anterior.

## Próximo passo
Me diga: **qual pedido (número + cliente + data) está aparecendo errado na sua tela agora?** Com isso eu rodo a query de diagnóstico e aí sim aplico a correção certa.

