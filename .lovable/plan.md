

## Mudança de Conceito

A planilha importada deve funcionar como **lista de veículos esperados** (referência para o conferente), não como criação automática de entradas. O conferente ainda precisa registrar cada entrada manualmente com fotos, KM, conferência de placa, etc.

## O que muda

### 1. `ImportarPlanilhaDialog.tsx` — Salvar como "cargas esperadas", não como movimentações

- Em vez de inserir em `movimentacoes_portaria`, salvar os dados parseados em um **state global/contexto** ou em uma tabela auxiliar
- Abordagem mais simples: manter os dados em memória (state no `Portaria.tsx`) como lista de "veículos esperados"
- O botão muda de "Importar X registros" para "Carregar X veículos esperados"
- Não cria nenhum registro no banco ao importar

### 2. `Portaria.tsx` — Exibir painel de "Veículos Esperados"

- Novo state `veiculosEsperados: ParsedRow[]` alimentado pelo dialog de importação
- Exibir um card/painel acima das tabs mostrando a lista de veículos esperados com: Placa, Motorista, Rota, N° Carga, Peso
- Cada linha tem um botão "Registrar Entrada" que abre o `RegistroMovimentoDialog` com os dados pré-preenchidos (placa, motorista, carga_id, rota, peso, empresa, qtd_entregas)
- Quando o conferente completa o registro (tira fotos, confere placa, informa KM), o veículo sai da lista de esperados
- Badge visual mostrando "X de Y veículos conferidos"

### 3. `RegistroMovimentoDialog.tsx` — Aceitar prefill expandido

- O `prefill` atual só funciona para retorno (saída). Expandir para aceitar prefill de entrada também
- Quando prefill vem da planilha (entrada), preencher: placa, motorista, empresa, carga_id, rota, peso, qtd_entregas
- O conferente ainda precisa: tirar foto da placa, confirmar placa via OCR, tirar foto do painel, informar KM inicial
- A `data_hora` será o momento do registro (não a data da planilha)

### 4. Marcar veículos já conferidos

- Quando uma entrada é criada com sucesso, comparar a placa com a lista de esperados e marcar como "conferido"
- Visual: linha riscada ou com check verde na lista de esperados

## Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/ImportarPlanilhaDialog.tsx` | Remover insert no banco; retornar dados via callback `onImport(rows)` |
| `src/pages/Portaria.tsx` | State `veiculosEsperados`; painel visual; botão "Registrar Entrada" por veículo; marcar conferidos ao criar movimentação |
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Aceitar prefill para entrada (não só saída); preencher campos da planilha mantendo campos obrigatórios (fotos, KM) vazios para o conferente |

