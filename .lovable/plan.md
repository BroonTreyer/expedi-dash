# Importação da planilha de motoristas/veículos esperados

## O que está acontecendo

A planilha enviada (`logistica_lovable.xlsx`) **não tem linha de cabeçalho** — os dados começam já na primeira linha (data, placa, destino, nº carga, peso, entregas, ...).

O leitor de planilha da Portaria só passa a ler linhas depois de encontrar um cabeçalho que contenha as palavras "PLACA" e "DESTINO". Como esse cabeçalho não existe no arquivo, nenhuma linha é aceita e aparece "Nenhum dado encontrado na planilha".

## Correção proposta

Fazer o leitor aceitar também planilhas sem cabeçalho, usando a posição das colunas:

| Coluna | Conteúdo detectado no arquivo |
|---|---|
| 1 | Data (08/08 e 10/08/2026) |
| 2 | Placa (NWN3975, RSD1E71, ...) |
| 3 | Destino (TRINDADE, PQ.OESTE, ...) |
| 4 | Nº da carga (10436000, ...) |
| 5 | Peso |
| 6 | Qtd. entregas |
| 9 | Tipo de veículo quando preenchido (ex. "HR") |
| 10 | Motorista |
| 11 | Transportadora ("TRANSP. X", "FP TRANSPORTE") ou ajudantes ("ISRAEL/GIL") |

Regras mantidas:
- Última coluna com "TRANSP. …" ou nome de empresa continua sendo tratada como **terceirizado** (transportadora); nomes soltos separados por "/" continuam como **ajudantes** da frota própria.
- Placa vazia/inválida continua marcada como incompleta na prévia.
- Planilhas que já têm cabeçalho continuam funcionando igual — o modo posicional só entra em ação quando nenhum cabeçalho é encontrado.

Resultado esperado: as 16 linhas do arquivo aparecem na prévia (14 terceirizadas e as 2 primeiras como frota própria) e podem ser importadas.

## Detalhe técnico

- `src/components/portaria/ImportarPlanilhaDialog.tsx`: em `parseXlsx`, quando nenhum cabeçalho for detectado, aplicar um segundo passe com mapa posicional fixo, reconhecendo linha de dados por coluna 1 com data válida (Date ou serial Excel) e coluna 2 com padrão de placa (`^[A-Z]{3}\d[A-Z0-9]\d{2}$` após normalizar). Colunas de flag/fator (7 e 8) são ignoradas; coluna 9 usada como `tipo_veiculo` só se for texto curto.
- Nenhuma alteração de banco de dados.