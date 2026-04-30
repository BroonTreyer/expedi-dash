## Diagnóstico real

A correção anterior só endureceu uma parte da lógica — não atacou a causa raiz. Investigando o banco e o código, identifiquei **três bugs independentes** que produzem exatamente os sintomas relatados (Fagno "Expedido" sem entrar, Jesumar sumido do Pátio, Sinomar inconsistente).

### Bug 1 — Status colapsa cargas diferentes que reusam o mesmo nome
`useStatusPortariaPorCarga` agrupa movimentos **só por `carga_id` (string)**, sem considerar a data da carga.

No banco existem várias cargas chamadas `"JR"` em datas distintas. A entrada antiga do Fagno em 27/04 (carga "JR" finalizada) está marcando como "Expedido" qualquer carga futura cujo `carga_id` também seja "JR" — incluindo a carga "JR" mostrada no print que ainda nem teve movimento na portaria.

### Bug 2 — Aba "Pátio" filtra por data do dia
`Portaria.tsx` aplica `dateFromStr/dateToStr` em todos os tabs. Jesumar entrou em 29/04 (`no_patio`, sem saída), mas a aba "Pátio" só lê movimentos do dia atual (30/04), então o veículo desaparece. Veículos sem saída devem aparecer no Pátio independentemente da data de chegada.

### Bug 3 — Migration de limpeza não foi aplicada
Os dois registros órfãos (Fagno `292abd8e…` e Sinomar `8768b164…`) ainda estão no banco. A migration anterior precisa de fato rodar.

---

## Plano de correção

### 1. `src/hooks/useStatusPortariaPorCarga.ts` — agregar por (carga_id + data)
- Adicionar a `data` da carga como parâmetro: o hook passa a receber `Array<{ carga_id, data }>`.
- Filtrar movimentos de cada carga por janela `[data 00:00, data+1d 00:00)` em `data_hora`. Movimentos antigos com mesmo nome de carga deixam de poluir o status.
- Atualizar todos os callers (dashboards/listas) para passar a data junto com o `carga_id`. Backwards-compatible via overload aceitando `string[]` legado, mas marcaremos uso novo nos arquivos de dashboard principal.

### 2. `src/components/portaria/PatioAtualTab.tsx` — receber lista "ativos" sem corte de data
- Em `Portaria.tsx`, passar para `PatioAtualTab` uma segunda lista (`movimentacoesAtivas`) carregada **sem filtro de data** — somente entradas dos últimos 7 dias que ainda não têm saída vinculada e não estão `finalizado`.
- O filtro de data continua valendo para Histórico e KPIs do dia.
- Pequena query nova no `useMovimentacoesPortaria` (`useMovimentacoesAtivasPatio`) com índice já existente em `data_hora`.

### 3. Aplicar limpeza dos dois órfãos
A migration `20260430125118_remove_movimentacoes_orfas.sql` já existe e está correta (tabela `movimentacoes_portaria`). Confirmar que ela é executada nesta rodada — os IDs ainda estão no banco.

### 4. Trava de prevenção em `MovimentoDetailsDialog.tsx`
Bloquear a criação de uma "saida" quando não há nenhuma "entrada" vinculável para a placa/carga nas últimas 72h, evitando reincidência de órfãos.

---

## Snippet chave (agregação por carga_id + data)

```typescript
// useStatusPortariaPorCarga.ts
const { data } = await supabase
  .from("movimentacoes_portaria")
  .select("carga_id, data_hora, tipo_movimento, categoria, etapa_terceirizado, etapa_carga_propria, horario_entrada, horario_chegada, horario_saida_final")
  .in("carga_id", cargaIds)
  .in("categoria", ["terceirizado", "carga_propria"]);

// Agrupar por (carga_id + data da carga)
for (const row of data ?? []) {
  const key = `${row.carga_id}::${cargaDataMap.get(row.carga_id)}`;
  const inicio = startOfDay(cargaData);
  const fim = addDays(inicio, 1);
  const ts = new Date(row.data_hora).getTime();
  if (ts < inicio.getTime() || ts >= fim.getTime()) continue; // ignora movimento de outra carga homônima
  grouped.get(key)!.push(row);
}
```

---

## Resultado esperado
- Fagno deixa de aparecer "Expedido" na carga "JR" de 30/04 (movimentos antigos da "JR" de 27/04 são filtrados pela data).
- Jesumar volta a aparecer na aba "Pátio" mesmo tendo entrado em 29/04.
- Sinomar exibe corretamente os movimentos legítimos sem o órfão de hoje.
- Órfãos antigos limpos; novos órfãos bloqueados na origem.
