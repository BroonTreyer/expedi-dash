

# 3 Mudanças: Transportadora, Consolidado carry-over, Status em destaque

## 1. Campo "Transportadora" no dialog Completar Logística

**Arquivo:** `src/components/dashboard/CarregamentoDialog.tsx`

- Adicionar campo de texto "Transportadora" na seção de logística (junto com Placa, Motorista, etc.)
- O campo será salvo no banco — precisa de uma nova coluna `transportadora` na tabela `carregamentos_dia`

**Migração SQL:** Adicionar coluna `transportadora text` à tabela `carregamentos_dia`

**Arquivo:** `src/hooks/useCarregamentos.ts` — adicionar `transportadora` ao tipo `Carregamento`

## 2. Consolidado: puxar cargas não-carregadas de dias anteriores

**Arquivo:** `src/pages/Consolidado.tsx` — função `useConsolidado`

A query atual filtra apenas `.eq("data", date)`. Quando a data selecionada for hoje, alterar para também trazer cargas de dias anteriores cujo status **não** seja "Carregado":

```
// Hoje: trazer do dia + dias anteriores não carregados
q = q.or(`data.eq.${date},and(data.lt.${date},status.neq.Carregado)`)
     .not("carga_id", "is", null)
```

Para datas passadas, manter o filtro simples `.eq("data", date)`.

## 3. Coluna Status em primeiro lugar + fonte maior

**Arquivo:** `src/pages/Consolidado.tsx`

- Mover a coluna "Status" para ser a **primeira coluna** após o chevron de expansão
- Aumentar a fonte do `StatusSelect` de `text-xs` para `text-sm` e o min-width

### Resumo de arquivos editados
- `src/components/dashboard/CarregamentoDialog.tsx` — campo transportadora
- `src/pages/Consolidado.tsx` — query carry-over + reordenar coluna status
- `src/hooks/useCarregamentos.ts` — tipo Carregamento
- Migração SQL — nova coluna `transportadora`

