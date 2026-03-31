

# Usar Data da Planilha como Data de Referência de Cada Veículo

## Problema

Hoje, ao importar a planilha, todos os veículos recebem a mesma `data_referencia` (a data do filtro da Portaria). A coluna `DATA` de cada linha da planilha é parseada mas ignorada na hora de salvar.

## Solução

Usar o campo `r.data` (coluna DATA da planilha) como `data_referencia` individual de cada veículo. Se a linha não tiver data válida, usar a data do filtro como fallback.

### Mudanças

**`src/hooks/useVeiculosEsperados.ts`**:
- No `mutationFn`, usar `r.data` convertida para formato `yyyy-MM-dd` como `data_referencia` de cada insert
- Parsear formatos comuns de data (dd/MM/yyyy, dd/MM, yyyy-MM-dd, número serial do Excel)
- Fallback para `dataReferencia` (data do filtro) se `r.data` estiver vazio ou inválido
- Ajustar o delete para limpar por todas as datas presentes nas rows (não só uma data fixa)
- Invalidar queries de forma mais ampla no `onSuccess`

**`src/components/portaria/ImportarPlanilhaDialog.tsx`**:
- Sem mudança — `r.data` já é parseado e exibido no preview

**`src/pages/Portaria.tsx`**:
- Sem mudança — continua passando `dataReferencia` como fallback

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/hooks/useVeiculosEsperados.ts` | Usar `r.data` por linha como `data_referencia`, parsear formatos de data, ajustar delete |

