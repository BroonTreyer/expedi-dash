

# Upload de Planilha na Portaria — Preview e Importação Automática

## O que será feito

Um botão "Importar Planilha" na Portaria que permite fazer upload de um arquivo XLSX (como o "Mapa de Carregamento" do print), visualizar os dados parseados em uma tabela preview, e ao confirmar, criar automaticamente registros de entrada em `movimentacoes_portaria` com os dados já preenchidos (placa, motorista, transportadora, carga_id, rota/destino, peso, qt entregas).

## Mapeamento da Planilha

A planilha tem 3 seções (sem título / FROTAS / INTERIOR), cada uma com colunas: DATA, PLACA, DESTINO, N° CARGA, PESO, QT ENTREGAS, MOTORISTA, TRANSP.

O parser vai:
1. Ler todas as linhas do XLSX ignorando headers vermelhos e linhas "TOTAL"
2. Detectar a seção (grupo) pelo texto "FROTAS" / "INTERIOR" (linhas sem esses textos = grupo padrão, ex: "PRÓPRIA")
3. Extrair: `data`, `placa`, `destino` (→ rota), `carga_id` (N° CARGA), `peso`, `qtd_entregas`, `motorista`, `transportadora`

## Componentes

### 1. `src/components/portaria/ImportarPlanilhaDialog.tsx` (novo)

- Dialog com dropzone/input para upload de `.xlsx`
- Usa biblioteca `xlsx` (SheetJS) para parsear client-side
- Mostra tabela preview com as colunas: Grupo | Data | Placa | Destino | N° Carga | Peso | Qt Entregas | Motorista | Transportadora
- Linhas com dados incompletos (sem placa) ficam em amarelo
- Contador de registros válidos
- Botão "Importar X registros" que cria registros em `movimentacoes_portaria` com:
  - `tipo_movimento`: "entrada"
  - `categoria`: "carga_propria" (ou "terceirizado" para seção FROTAS/INTERIOR)
  - `placa`, `motorista`, `empresa` (transportadora), `rota` (destino), `carga_id`, `peso`, `qtd_entregas`
  - `data_hora`: data da planilha + horário atual

### 2. `src/pages/Portaria.tsx` (editar)

- Adicionar botão "Importar" ao lado do botão CSV, com ícone `Upload`
- State para controlar abertura do dialog

## Dependência

- Instalar pacote `xlsx` para parsing client-side da planilha

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/components/portaria/ImportarPlanilhaDialog.tsx` | Criar |
| `src/pages/Portaria.tsx` | Adicionar botão + import do dialog |
| `package.json` | Adicionar `xlsx` |

Sem alteração de banco — usa a tabela `movimentacoes_portaria` existente.

