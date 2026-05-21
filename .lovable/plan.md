## Objetivo

Adicionar exportação para Excel (.xlsx) na página de Pré-cargas, em dois níveis:

1. **Por pré-carga** — botão "Baixar Excel" ao lado do atual "Baixar PDF" em cada card.
2. **Resumo geral** — botão "Excel resumo" no topo da página, exportando tudo que está visível (respeitando o filtro de busca).

## Arquivos a criar/alterar

**Novo:** `src/lib/pre-cargas-export.ts`
Centraliza a geração dos XLSX usando a biblioteca `xlsx` (já presente no projeto, usada em `useRelatorios.ts` e `mp-export.ts`).

Duas funções:

- `exportarPreCargaUnica(carga: PreCargaGrupo)` — gera 1 arquivo com 3 abas:
  - **Resumo** — identificação (carga, data, placa, motorista, transportadora, tipo, ordem, destinos) + totais (pedidos, peso total, embarcado, ruptura).
  - **Pedidos** — uma linha por pedido: nº, cliente, código, cidade/UF, vendedor, peso embarcado, peso ruptura, qtd itens, qtd rupturas.
  - **Itens** — uma linha por item do pedido: nº pedido, cliente, código produto, produto, qtd, peso original, peso carregado, peso ruptura, é ruptura? (Sim/Não), tipo (Total/Parcial), motivo.
  Nome do arquivo: `pre-carga_<nomeCarga|cargaId>_<data>.xlsx`.

- `exportarPreCargasResumo(cargas: PreCargaGrupo[])` — gera 1 arquivo com 4 abas consolidando todas as pré-cargas filtradas:
  - **Resumo geral** — KPIs totais (qtd cargas, qtd pedidos, peso total, embarcado, ruptura, qtd itens em ruptura) + período coberto.
  - **Cargas** — 1 linha por pré-carga: cargaId, nome, data, placa, motorista, transportadora, tipo, ordem, destinos, qtd pedidos, peso total, embarcado, ruptura, qtd rupturas.
  - **Pedidos** — 1 linha por pedido de todas as cargas: carga, data, nº pedido, cliente, código, cidade/UF, vendedor, peso embarcado, peso ruptura, qtd rupturas.
  - **Rupturas** — apenas itens em ruptura: carga, data, nº pedido, cliente, código produto, produto, tipo (Total/Parcial), peso original, disponível, ruptura, motivo.
  Nome do arquivo: `pre-cargas_resumo_<YYYY-MM-DD>.xlsx`.

Todos os números em pt-BR (vírgula decimal nos campos de peso via formatação numérica do XLSX), datas `dd/MM/yyyy`.

**Alterar:** `src/pages/PreCargas.tsx`
- Adicionar botão "Excel resumo" no header (ao lado do search), chamando `exportarPreCargasResumo(filtradas)`. Desabilitado quando `filtradas.length === 0`.
- Passar nova prop `onExportXlsx` ao `PreCargaCard`.

**Alterar:** dentro de `PreCargaCard` (mesmo arquivo)
- Adicionar botão secundário "Excel" ao lado do "Baixar PDF" no canto direito do card, chamando `exportarPreCargaUnica(carga)`. Mesmo estilo `variant="outline"` `size="sm"` com ícone `FileSpreadsheet` do lucide-react.

## Não-objetivos

- Não altera o PDF existente.
- Não altera o hook `usePreCargas` nem o banco.
- Não muda layout do card além dos dois botões novos.

## Detalhes técnicos

- Biblioteca: `xlsx` (já instalada).
- Formato pt-BR aplicado via `cell.z = '#,##0.0'` para pesos e `'dd/mm/yyyy'` para datas, com `cellDates: true` quando aplicável (alternativa: enviar strings já formatadas — mais simples e suficiente para o uso atual; vou seguir essa abordagem como em `useRelatorios.ts`).
- Larguras de coluna ajustadas via `ws['!cols']`.
- Tudo client-side, sem chamadas extras à API.