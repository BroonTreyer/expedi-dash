

## Plano: Toggle "Logística OK" como filtro exclusivo

### Problema
Quando o toggle "Ver Logística OK" está ativo, ele mostra os itens logística OK **junto** com todos os outros. O esperado é que mostre **apenas** os itens logística OK.

### Solução

**`src/pages/Index.tsx`** — Alterar a lógica do `filtered` (linha ~112-114):

```text
// Atual:
if (c.etapa === "logistica" && !showLogistica) return false;

// Novo:
if (showLogistica && c.etapa !== "logistica") return false;
if (!showLogistica && c.etapa === "logistica") return false;
```

Quando `showLogistica` está ativo, esconde tudo que **não** é logística. Quando inativo, esconde logística (comportamento atual).

### Arquivo alterado
- `src/pages/Index.tsx` — 2 linhas de lógica no filtro

