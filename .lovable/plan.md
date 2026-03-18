

# Editar Data de Cargas no Consolidado

## O que será feito

Adicionar a possibilidade de editar a **data** de uma carga consolidada inteira (todos os itens do grupo) diretamente na tabela do Consolidado. Isso permite corrigir situações onde uma carga foi marcada como "Carregado" no dia errado.

## Como funciona

- Na linha de cada grupo de carga na tabela, adicionar um **ícone de edição** (ou tornar a data clicável) que abre um **Popover com calendário** para selecionar a nova data.
- Ao selecionar a nova data, todos os registros (`carregamentos_dia`) que pertencem àquela `carga_id` serão atualizados com a nova data via mutation.
- Confirmação visual com toast de sucesso e invalidação do cache.

## Alterações

### `src/pages/Consolidado.tsx`
1. Adicionar uma coluna **"Data"** na tabela (após Status ou no final).
2. Cada linha de grupo exibe a data atual da carga com um ícone de calendário clicável.
3. Ao clicar, abre um Popover com Calendar para escolher a nova data.
4. Criar uma nova mutation `updateCargaDate` que faz `UPDATE carregamentos_dia SET data = novaData WHERE carga_id = X`.
5. No `onSuccess`, invalidar queries `consolidado` e `carregamentos`.

### Tipo `CargaGroup`
- Adicionar campo `data` ao grupo (pegar do primeiro item).

### Sem alterações no banco
- A coluna `data` já existe e aceita qualquer date. Não precisa de migration.

