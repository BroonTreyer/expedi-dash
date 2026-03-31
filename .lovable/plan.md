

# Corrigir Parser da Planilha de Carregamento

## Problema

O parser atual tem problemas ao ler a planilha real:

1. **Datas lidas como números seriais do Excel** — A coluna DATA (ex: "30/03/2026") é armazenada pelo Excel como um número serial (ex: 46111). O `xlsx.js` retorna esse número, não a string formatada. O `get("DATA")` converte para `"46111"`, que aparece errado no preview e pode falhar no `parseDataReferencia`.

2. **PESO com separador decimal vírgula** — Valores como "890,21" e "1163,4" podem ser lidos incorretamente dependendo de como o Excel armazena.

3. **Cabeçalhos com filtros do Excel (INTERIOR)** — A seção INTERIOR tem setas de filtro (▼) nos headers, que podem adicionar caracteres invisíveis e impedir o match das colunas.

## Solução

Ajustar o `parseXlsx` em `ImportarPlanilhaDialog.tsx`:

### 1. Ler datas corretamente
- Passar `{ cellDates: true }` no `XLSX.read` para que xlsx.js converta datas automaticamente para objetos `Date`
- No `get("DATA")`, detectar se o valor é um `Date` e formatar como `dd/MM/yyyy`
- Manter fallback para números seriais do Excel (converter manualmente)

### 2. Limpar caracteres invisíveis dos headers
- No `buildColumnMap`, aplicar regex para remover caracteres não-ASCII/não-alfanuméricos antes do match (já faz `.toUpperCase()`, adicionar `.replace(/[^\w\sÁÉÍÓÚÃÕÊ°]/g, "")`)

### 3. Tratar PESO com vírgula
- Na função `parseNum`, converter vírgula para ponto antes de `Number()`

### 4. Extrair DT. ENTREGA do cabeçalho como fallback
- Ao encontrar uma linha com "DT. ENTREGA" ou "DT.ENTREGA", extrair a data e usar como fallback quando a linha de dados não tem data preenchida

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/ImportarPlanilhaDialog.tsx` | `cellDates: true`, formatar Date objects, limpar headers, tratar vírgula no PESO, extrair DT.ENTREGA |

