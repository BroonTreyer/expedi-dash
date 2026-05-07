## Goal
Mostrar a cidade (e UF) ao lado do nome do cliente no Romaneio impresso (CargaPrintDialog), na posição "depois da coluna de cliente".

## Mudanças

### 1. `src/components/dashboard/CargaPrintDialog.tsx`
- Adicionar `cidade?: string | null` e `uf?: string | null` na interface `ClienteGroup`.
- No render do grupo, exibir após o nome do cliente:
  `33736 – SENDAS DISTRIBUIDORA L 169 · GOIÂNIA/GO`
  (cidade em destaque sutil — `text-muted-foreground` em itálico ou separador `·`).

### 2. `src/pages/Consolidado.tsx` (handleOpenRomaneio)
- Adicionar `cidade` e `uf` ao tipo do `clienteMap` e popular a partir de `item.cidade` / `item.uf`.
- Repassar nos `groups` retornados em `CargaPrintData`.

### 3. `src/pages/Index.tsx` (montagem do printData no fechamento)
- Adicionar `cidade`/`uf` ao groupMap a partir de `c.cidade` / `c.uf`.
- Repassar nos `groups`.

### 4. `src/components/dashboard/FechamentoLoteDialog.tsx`
- No `groups.map(...)` que monta o `CargaPrintData`, incluir `cidade: g.cidade, uf: g.uf` (já existem no `RotaGroup`).

Sem mudanças de banco. Sem novas queries. Apenas propagação de campos já carregados.
