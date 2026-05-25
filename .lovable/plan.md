## Diagnóstico

O motorista **GUSTAVO ARAÚJO DE OLIVEIRA** (Los Transportes, placa UIX8B83, carga `MOISA + ELIAS`) existe no banco:

- Em `carregamentos_dia`: 59 itens com `data = 2026-04-23`, status `Carregando`, transportadora `Los Transportes`, peso total ~32.063 kg.
- Em `movimentacoes_portaria`: chegou em 21/05, entrou no pátio 22/05 17:56, **saída final 23/05 03:28**.

Pelo `computeDataEfetivaTerceirizada`, como `horario_saida_final` está preenchido, a data efetiva é **23/05/2026**. Ele deveria aparecer no Consolidado do dia 23 (ou no intervalo 22–23).

## Causa raiz

Em `src/pages/Consolidado.tsx`, os três blocos de carry-over (linhas ~83-118, 124-161, 172-210) limitam a busca de cargas faltantes a `data >= 30 dias atrás`:

```ts
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const limitDate = thirtyDaysAgo.toISOString().split("T")[0];
// ...
.gte("data", limitDate)
```

Hoje é 25/05/2026 → `limitDate = 25/04/2026`. A carga do Gustavo tem `data = 23/04/2026`, **2 dias fora da janela**. Resultado: a portaria registra a saída em 23/05, o ID da carga é encontrado em `movimentacoes_portaria`, mas o fetch subsequente em `carregamentos_dia` filtra esses 2 dias fora e a carga some.

Como já restringimos por `in("carga_id", faltantes)` (lista explícita curta vinda das movimentações), o `gte("data", limitDate)` é redundante e prejudicial.

## Plano

**Arquivo:** `src/pages/Consolidado.tsx`

Nos três blocos de carry-over (carry-over de "hoje" por movs, carry-over por saída no intervalo, carry-over de pátio), **remover** o filtro `.gte("data", limitDate)` e a construção de `thirtyDaysAgo`/`limitDate` correspondente. As queries já são restringidas por `in("carga_id", faltantes)` (lista pequena de IDs específicos vindos de `movimentacoes_portaria`), então não há risco de explosão de dados.

Manter o `.lt("data", dateFrom)` (ou `.lt("data", todayStr)` no bloco de pátio) para evitar duplicar registros já trazidos pelo fetch principal.

**Arquivo:** `mem/features/data-efetiva-terceirizadas.md`

Atualizar a nota para registrar que o carry-over por carga_id explícito **não tem limite de 30 dias** — pode trazer cargas de qualquer data, desde que tenham movimentação de portaria recente.

## Resultado esperado

- Selecionando 23/05 (ou 22–23), a carga `MOISA + ELIAS` com Gustavo passa a aparecer normalmente, somando ~32 t ao peso total do dia 23.
- Qualquer terceirizada com `data` original muito antiga (carga "envelhecida" no pátio por semanas) volta a aparecer no dia em que efetivamente sai pela portaria.
