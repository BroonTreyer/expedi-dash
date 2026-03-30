

## Problema

O parser atual assume que MOTORISTA está na coluna 6 e TRANSPORTADORA na coluna 7, mas a planilha real tem colunas extras entre QT ENTREGAS e MOTORISTA (CUSTO/KG, % FRETE, IPO VEICULO na seção PRÓPRIA; NEG?, VLR KG, IPO VEICULO em FROTAS; NEG?, VLR KG, VLR FRETE em INTERIOR). MOTORISTA está na posição 9 e TRANSP/AJUDANTES na posição 10.

## Solução

Reescrever o parser para detectar dinamicamente a posição das colunas usando a linha de cabeçalho de cada seção, em vez de posições fixas.

### Lógica do novo parser

1. Ao encontrar uma linha de cabeçalho (contém "PLACA", "DESTINO", etc.), mapear o índice de cada coluna conhecida
2. Usar esse mapa para extrair dados das linhas seguintes até o próximo cabeçalho/seção
3. Colunas mapeadas: DATA, PLACA, DESTINO, N° CARGA, PESO, QT ENTREGAS, MOTORISTA, TRANSP./AJUDANTES, IPO VEICULO/TIPO VEICULO
4. Extrair também FATURAMENTO e DT. ENTREGA do cabeçalho superior da planilha
5. Adicionar campo `ajudantes` e `tipo_veiculo` ao ParsedRow
6. Na seção PRÓPRIA, coluna 10 = AJUDANTES; em FROTAS/INTERIOR, coluna 10 = TRANSPORTADORA

### Arquivo a editar

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/ImportarPlanilhaDialog.tsx` | Reescrever `parseXlsx` com detecção dinâmica de colunas via header row; adicionar campos `ajudantes` e `tipo_veiculo` ao ParsedRow e à tabela preview; mapear `ajudantes` para o campo correspondente na importação |

### Detalhes técnicos

- Quando uma linha contém "PLACA" e "DESTINO", tratar como header e construir um `Map<string, number>` dos nomes normalizados para índices
- Palavras-chave de busca nos headers: `DATA`, `PLACA`, `DESTINO`, `CARGA` (para N° CARGA), `PESO`, `ENTREG` (para QT ENTREGAS), `MOTORISTA`, `TRANSP`, `AJUDANTE`, `VEICULO`/`VEÍCULO`
- Detecção de grupo: linhas que contenham apenas "FROTAS" ou "INTERIOR" (já existe, manter)
- Na importação para `movimentacoes_portaria`, mapear `tipo_veiculo` para um campo de observação ou ignorar (não existe coluna dedicada na tabela)

