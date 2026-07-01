## Objetivo
Adicionar exportação em Excel (.xlsx) organizada na tela de Consolidados, ao lado do botão "Imprimir".

## Escopo
- Botão **"Excel"** no cabeçalho da tela `/consolidado`, respeitando os filtros ativos (período, UF, status, etapa portaria, busca por OC).
- Nome do arquivo: `consolidado_{dataInicio}_{dataFim}.xlsx` (ou `consolidado_oc_{termo}.xlsx` quando busca por ordem de carga).

## Estrutura do workbook (3 abas)

**Aba 1 — Resumo**
Cabeçalho com período, filtros aplicados e KPIs (total de veículos, total de pedidos, peso total, peso planejado, peso cortado, rupturas). Uma linha por carga:
| Data | Nome Carga | OC | Placa | Motorista | Tipo Caminhão | Transportadora | Tipo Frete | Status | Etapa Portaria | Peso Efetivo (kg) | Peso Planejado (kg) | Peso Cortado (kg) | Qtd Pedidos | Rupturas | Parciais | Qtd Clientes | UFs |

Linha final de **TOTAIS** somando pesos e contagens.

**Aba 2 — Pedidos**
Lista granular (uma linha por pedido/produto de todas as cargas filtradas):
| Data | Nome Carga | OC | Placa | Motorista | Transportadora | Nº Pedido | Cliente | Cód. Cliente | UF | Cidade | Produto | Cód. Produto | Quantidade | Peso (kg) | Ruptura | Peso Não Carregado | Qtd Não Carregada | Vendedor | Observações |

**Aba 3 — Rupturas**
Somente linhas com `ruptura=true` (mesmas colunas da aba Pedidos) com contagem/percentual no topo.

## Formatação
- Números em pt-BR nativos (formato `#,##0` para kg/quantidades).
- Datas dd/MM/yyyy.
- Larguras de coluna ajustadas por tipo (placa 12, nome/cliente 28-32, produto 30, obs 30).
- Cabeçalho em negrito na primeira linha de dados de cada aba.
- Ordenação: Resumo por Data + Nome Carga; Pedidos por Data + Nome Carga + Nº Pedido.

## Implementação técnica
1. Novo arquivo `src/lib/consolidado-export.ts`:
   - `exportConsolidadoXLSX(groups: CargaGroup[], rawData: Carregamento[], meta: { dateFrom, dateTo, ordemCarga, filtros })`.
   - Usa `xlsx` (já usado em `mp-export.ts`, `motorista-export.ts`, `useRelatorios.ts`) via `XLSX.utils.aoa_to_sheet` + `book_append_sheet` + `writeFile`.
2. Em `src/pages/Consolidado.tsx`:
   - Importar `FileSpreadsheet` (lucide) e a função de export.
   - Novo botão logo antes do "Imprimir" (mesmo padrão visual, `hidden sm:inline` para o label).
   - `onClick` chama `exportConsolidadoXLSX(sortedGroups, rawData ?? [], { ... })`.
3. Reaproveitar `groupByCarga` e os filtros já aplicados (`sortedGroups`) para manter paridade com a tela.

## Fora de escopo
- Nenhuma mudança de layout, filtros, dados ou lógica de negócio.
- Nenhuma mudança em impressão (`ConsolidadoPrintDialog`) ou romaneio.
