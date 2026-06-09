## Objetivo
Trocar o formato do Excel de pré-carga (individual) para o MESMO layout usado no fechamento de carga (`RoteirizacaoDialog.handleExportExcel`): uma única aba, agrupada por cliente, com colunas `#, CÓDIGO, NOME, CIDADE, UF, PESO, VENDEDOR` + linha de total ao final.

## Mudanças

### `src/lib/pre-cargas-export.ts` — função `exportarPreCargaUnica`
Substituir as 3 abas atuais (Resumo / Pedidos / Itens) por uma única aba no padrão do print:

- Header: `["#", "CÓDIGO", "NOME", "CIDADE", "UF", "PESO", "VENDEDOR"]`.
- Agrupar `carga.pedidos` por `codigo_cliente` (fallback: nome do cliente quando código vier vazio), somando `pesoEmbarcado` (= `pesoEfetivo` por item, igual à lógica do fechamento). Cada grupo = 1 linha.
- Ordem dos clientes: mesma ordem em que aparecem em `carga.pedidos` (já preservada pelo agrupador no `Index.tsx` e `PreCargas.tsx`).
- Coluna `#`: `"1º"`, `"2º"`, … igual ao fechamento.
- Coluna `VENDEDOR`: união dos vendedores dos itens do cliente, juntada com `", "`.
- Linha final: `["", "", "", "", "", totalPeso, ""]`.
- Larguras de coluna idênticas às do `RoteirizacaoDialog` (5, 10, 35, 22, 5, 10, 15).
- Nome da aba: `"Pré-carga"`. Nome do arquivo: `pre-carga_${nome}_${data}.xlsx` (mantém).

A função `exportarPreCargasResumo` (botão "Excel resumo" da página `/precargas`) **não muda** — é o resumo agregado de várias cargas, escopo diferente.

## Onde isso reflete
- Botão Excel do painel amarelo do Dashboard (`PreCargasPanel`) → já chama `exportarPreCargaUnica`.
- Botão Excel individual de cada card na página `/precargas` (`PreCargaCard`) → já chama `exportarPreCargaUnica`.
Ambos passam a baixar o novo layout, alinhado com o fechamento de carga.

## Fora de escopo
- Não mexer em `RoteirizacaoDialog` (é a referência).
- Não mexer no botão "Excel resumo" da página `/precargas`.
- Sem mudança de hooks, dados ou cálculo de peso.
