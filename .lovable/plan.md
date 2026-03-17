

# Mostrar itens consolidados não-carregados no painel diário

## Problema
Linha 101 de `Index.tsx` esconde todos os itens com `carga_id != null`. Itens que foram finalizados em carga mas ainda não têm status "Carregado" ficam invisíveis no painel do dia atual.

## Solução
Alterar o filtro em `src/pages/Index.tsx` (linha 101) para mostrar itens com `carga_id` se o status **não** for "Carregado":

```
// Antes:
if (c.carga_id != null) return false;

// Depois:
if (c.carga_id != null && c.status === "Carregado") return false;
```

Isso faz com que itens já vinculados a uma carga, mas com status "Aguardando", "Carregando", etc., continuem visíveis no painel diário para acompanhamento.

### Arquivo editado
- `src/pages/Index.tsx` — uma linha alterada no filtro `filtered`

