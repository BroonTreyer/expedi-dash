## Diagnóstico

A carga do Raimundo (CF FRANGO / RBK7D22) deveria aparecer no Consolidado do dia **19/05** (saída pela portaria às 22:14), mas continua aparecendo em **15/05** (data original).

A causa é o efeito colateral do fix anterior:

- Agora existem **dois grupos** com `cargaId = "CF FRANGO"` no Consolidado (Raimundo 15/05 e Toni 29/04).
- O hook `useStatusPortariaPorCarga` retorna um `Map` indexado **só por `carga_id`** — uma única entrada por nome de carga.
- Internamente, ele constrói `placaByCarga` com **última placa vencendo**. Como Toni (JBM8E58) acaba sobrescrevendo Raimundo (RBK7D22), o filtro de placa elimina os movimentos do Raimundo da consulta.
- Resultado: `statusPortariaMap.get("CF FRANGO").saida` devolve os dados do Toni (ou `null`), e `computeDataEfetivaTerceirizada` mantém a data original (15/05) para o grupo do Raimundo.

A mesma falha afeta o badge da etapa portaria (Raimundo poderia receber o status do Toni e vice-versa) e a Expedição, que segue o mesmo padrão de lookup `get(carga_id)`.

## Plano

**Mudar a chave do resultado do hook para o composto `carga_id|placa` quando placa for fornecida**, e atualizar os callers.

### 1. `src/hooks/useStatusPortariaPorCarga.ts`

- Substituir `placaByCarga: Map<carga_id, placa>` por `placasByCarga: Map<carga_id, Set<placa>>` — guarda **todas** as placas pedidas para cada `carga_id`, em vez de só a última.
- Ao construir `groupedAll`, criar uma entrada separada para cada combinação `(carga_id, placa)`:
  - Chave interna: `${carga_id}|${placa ?? ""}`.
  - Linhas sem placa (ou cujo placa não bate com nenhuma das pedidas) ficam num bucket `${carga_id}|` (fallback para callers legados sem placa).
- Aplicar a janela operacional / fallback exatamente como já está, mas por combinação.
- O `Map` resultado passa a ser indexado por `${carga_id}|${placa ?? ""}`. Sempre incluir também a entrada agregada `${carga_id}|` (sem placa) usando todos os movimentos do `carga_id` — preserva o comportamento dos callers que ainda chamam `get(cargaId)` ou usam a forma legada `string[]`.
- Exportar um helper `makeStatusKey(cargaId, placa?)` para os callers montarem a chave sem replicar a string.

### 2. `src/pages/Consolidado.tsx`

- Substituir os três `statusPortariaMap?.get(g.cargaId)` por `statusPortariaMap?.get(makeStatusKey(g.cargaId, g.placa))`:
  - Cálculo de `saida` para `computeDataEfetivaTerceirizada` (linha ~590).
  - Filtro por etapa da portaria (linha ~606).
  - Accessor de sort `portaria` (linha ~626).
  - Contadores `portariaCounts` (linha ~735).

### 3. `src/pages/Expedicao.tsx`

- Mesmo ajuste nos dois `statusPortariaMap?.get(c.carga_id)` (linhas ~168 e ~188) usando `makeStatusKey(c.carga_id, c.placa)`.

### 4. Sem mudanças em

- `PortariaStatusBadge` (consome `StatusPortariaInfo` direto, sem `.get`).
- Banco, edge functions ou outras telas.

## Resultado esperado

- Raimundo (CF FRANGO / RBK7D22) passa a aparecer no Consolidado do **dia 19/05** (data da saída pela portaria), mantendo `pesoTotal = 30.312,6 kg`.
- A carga antiga do Toni (CF FRANGO / JBM8E58) só aparece se o intervalo abranger a data de saída dela (30/04) — sem se misturar com a do Raimundo.
- Etapa da portaria e KPIs de Expedição passam a refletir a placa certa para cada carga homônima.
