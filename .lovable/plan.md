

# Permitir adicionar itens a cargas de dias anteriores não carregadas

## Problema
A query do painel (`useCarregamentos`) para o dia atual traz apenas itens de dias anteriores **sem** `carga_id`. Cargas fechadas de dias anteriores que ainda não foram carregadas não aparecem nos dados, então a lista "Adicionar à Carga" fica vazia para essas cargas.

## Solução
Alterar a query em `src/hooks/useCarregamentos.ts` para, quando a data for hoje, trazer **todos** os itens de dias anteriores com status diferente de "Carregado" (independente de terem carga_id ou não):

```
// Antes:
q = q.or(`data.eq.${date},and(data.lt.${date},carga_id.is.null)`);

// Depois:
q = q.or(`data.eq.${date},and(data.lt.${date},status.neq.Carregado)`);
```

Isso faz com que cargas fechadas de dias anteriores (que têm `carga_id` mas não foram carregadas) apareçam no `cargasFechadas` memo do `Index.tsx`, permitindo ao usuário selecionar essas cargas no dialog "Adicionar à Carga".

A tabela principal já filtra corretamente os itens carregados (`carga_id != null && status === "Carregado"`), então os itens novos aparecerão normalmente.

### Arquivo editado
- `src/hooks/useCarregamentos.ts` — uma linha alterada na query

