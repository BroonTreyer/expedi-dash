

# Sanfona (accordion) para pedidos agrupados na tabela

## Problema
Pedidos com múltiplos itens mostram todas as linhas abertas, gerando bagunça visual em pedidos grandes.

## Solução
Para grupos com mesmo `numero_pedido` e mais de 1 item: mostrar apenas a **primeira linha resumida** (com total de itens, peso total) e um botão de expandir/colapsar. As linhas dos produtos ficam escondidas por padrão.

Pedidos com 1 item só continuam como linha normal, sem sanfona.

## Mudanças — `CarregamentoTable.tsx`

**Desktop:**
1. Pré-processar `data` em grupos: `{ pedido, items[] }`
2. Para grupos com 1 item: renderizar linha normal
3. Para grupos com 2+ itens:
   - Linha-resumo clicável com ChevronRight/Down, N° Pedido, Etapa, Status, Vendedor, resumo (ex: "3 produtos — 1.500 kg"), Caminhão, Motorista, Cliente, UF, e botões de ação
   - State local `expandedPedidos: Set<number>` controlando quais estão abertos
   - Ao clicar na linha-resumo, toggle expand
   - Linhas-filhas (produtos individuais) renderizadas condicionalmente, mostrando só: Cód. Produto, Produto, Qtd, Peso, Início, Fim, Obs

**Mobile:**
- Mesmo conceito: card do grupo mostra header com resumo, clicável para expandir os itens individuais dentro

## Arquivo (1)
- `src/components/dashboard/CarregamentoTable.tsx` — adicionar state `expandedPedidos`, lógica de agrupamento, linha-resumo com chevron, e renderização condicional das linhas-filhas

