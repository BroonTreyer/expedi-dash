## Auditoria do fluxo Pré-carga → Consolidado → Expedição

Fluxo correto:
1. **Pré-carga** (`etapa = 'pre_carga'`): salva no `FechamentoLoteDialog` sem fechar — só aparece em `/pre-cargas`.
2. **Fechada** (`etapa = 'logistica'`): aparece em `/` (Dashboard), `/consolidado` e `/expedicao`.
3. **Portaria**: registra entrada/saída e finaliza.

## Resultado da revisão

### ✅ OK
- `usePreCargas` filtra `eq("etapa","pre_carga")`.
- `Index.tsx` (Dashboard) descarta `c.etapa === 'pre_carga'` em filtros, KPIs e pré-cargas agrupadas.
- `Consolidado` — já corrigido no turno anterior (`.neq("etapa","pre_carga")` nas 3 queries).
- `PainelCargasFechadas` (`useCarregamentos.ts`) usa `eq("etapa","logistica")`.
- `FechamentoLoteDialog` grava `etapa: 'pre_carga'` no "salvar como pré-carga" e `etapa: 'logistica'` ao fechar.

### ❌ Bug encontrado — Expedição vaza pré-cargas

`src/hooks/useCargasDiaExpedicao.ts` busca `carregamentos_dia` apenas com `not("carga_id","is",null)`. Se uma pré-carga já tem `transportadora` preenchida (cenário comum, pois o `FechamentoLoteDialog` permite salvar com todos os campos), ela entra na lista da Expedição — mesmo problema que tínhamos no Consolidado.

Impacto: a pré-carga aparece em "Cargas do dia / a carregar", infla o KPI **kg a carregar** e o peso total da Expedição.

## Correção

Em `src/hooks/useCargasDiaExpedicao.ts`, adicionar `.neq("etapa","pre_carga")` em ambas as queries de `carregamentos_dia`:

1. Query principal (linha ~67) — paginação por `data = dateStr`.
2. Carry-over de data efetiva terceirizada (linha ~101) — busca por `in("carga_id", faltantes)`.

## Escopo

- Apenas frontend, uma única alteração em `useCargasDiaExpedicao.ts`.
- Não toca em RLS, migrações, Pré-cargas, Consolidado, Dashboard ou Portaria.

## Verificação

Após aplicar:
- Pré-carga do Célio não deve aparecer em `/expedicao` nem somar nos KPIs de kg.
- Ao fechar a pré-carga (etapa → `logistica`), ela passa a aparecer normalmente em Consolidado e Expedição.
