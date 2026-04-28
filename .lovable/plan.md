# Unificar linhas de produtos pelo código do cliente

## O que vai mudar

Hoje a tabela do dashboard agrupa por **código do cliente + número do pedido**. Resultado: se o mesmo cliente teve 2 lançamentos no dia (números 45 e 78), aparecem **2 cards**.

A nova regra: agrupar por **data + código do cliente**. Tudo do mesmo código, no mesmo dia, vira **1 card único**. Códigos diferentes (D247 vs D243 vs D196) continuam **separados** ✅.

## Comportamento

```text
Antes:
  D208 (cód 33009) Pedido 45 — 12 produtos    → card 1
  D208 (cód 33009) Pedido 78 — 3 produtos     → card 2
  D243 (cód 32995) Pedido 50 — 5 produtos     → card 3

Depois:
  D208 (cód 33009) — 15 produtos · 2 pedidos  → card único
  D243 (cód 32995) — 5 produtos · Pedido 50   → card único
```

- Cabeçalho do card: nome + código do cliente (igual hoje).
- Quando há 1 só pedido: mostra "Pedido nº X". Quando há vários: mostra "**N pedidos**".
- Total de peso e contagem de produtos somados.
- Linhas sem `codigo_cliente` continuam exibidas individualmente.

## Onde mexer

**1 arquivo só**: `src/components/dashboard/CarregamentoTable.tsx`

- **Função `buildGroups`** (linha 101): trocar a chave de agrupamento de `${codigo_cliente}__p${numero_pedido}` para `${data}__${codigo_cliente}`.
- **Cabeçalhos do card mobile e da linha desktop**: ajustar para mostrar "N pedidos" quando o grupo tem mais de um `numero_pedido` distinto.

Aplicado nas duas visualizações (Mobile cards + Desktop table).

## O que NÃO muda

- **Banco**: trigger `set_numero_pedido` continua como está. Cada submit ainda gera 1 número de pedido — só a **visualização** consolida.
- **Vínculo entre produtos**: ações em lote (excluir pedido inteiro, clonar, editar) continuam operando sobre os itens do grupo — só que agora "o grupo" passa a ser todos os produtos daquele código no dia.
- **Outras telas** (Aprovações, Meus Pedidos do vendedor, Consolidado, Fechamento de carga, Roteirização, Impressão): mantêm sua lógica atual — não dependem dessa chave de agrupamento.
- **Códigos diferentes nunca se misturam** — cada filial DMA permanece como pedido próprio.

## Resumo técnico

Mudança isolada (~20 linhas) em `CarregamentoTable.tsx`. Sem migração, sem alteração de schema, sem impacto em outras telas.
