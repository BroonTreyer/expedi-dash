# Exportar adiantamentos para Excel

## O que será feito
Um botão **Exportar Excel** no topo da aba Adiantamentos (Logística), que gera uma planilha com todos os adiantamentos listados.

## Conteúdo da planilha
Aba única "Adiantamentos", uma linha por adiantamento:

- Número
- Transportadora
- Ordem de Carga (OC) — ou o número do lote quando o agrupamento for por lote
- Qtd CT-e
- CT-es (números concatenados)
- Peso total (kg)
- Valor total dos CT-es (valor total do frete)
- Percentual do adiantamento
- Valor do adiantamento
- Valor do saldo
- Status
- Data de pagamento
- Data de quitação
- Observações

Linha final de **TOTAIS** somando peso, valor total, adiantamento e saldo.

Números e datas em formato pt-BR; valores como número (para permitir soma no Excel).

## Escopo dos dados
Exporta o que está carregado na tela respeitando o filtro de status atual (pendentes / pagos / quitados / todos), para o arquivo refletir exatamente o que o usuário está vendo. Nome do arquivo: `adiantamentos_<data>.xlsx`.

## Detalhes técnicos
- Novo `src/lib/adiantamentos-export.ts` com `exportarAdiantamentosXLSX(lista)` usando `xlsx` (já no projeto), largura de colunas definida, seguindo o padrão de `src/lib/consolidado-export.ts`.
- `src/components/logistica/AdiantamentosTab.tsx`: botão de exportação no cabeçalho da aba chamando a função com a lista atual (inclui `cteNumbers` já retornado por `useAdiantamentos`).
