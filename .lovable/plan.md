## Problema

Na aba **Pátio Atual** (Portaria → Carga Própria), os três veículos com tag "Em Rota" mostram exatamente o mesmo tempo decorrido (ex.: "em rota há 3h 41min"), mesmo tendo horários de partida bem diferentes (01:01, 04:19, 05:57).

## Causa raiz

O cálculo usa o campo errado. Em `src/components/portaria/PatioAtualTab.tsx` (`getMinutosNoPatio`), para veículos `em_rota` o tempo é calculado a partir de `m.horario_saida_final`. Verificando o banco:

- Os 27 registros com `etapa_carga_propria='em_rota'` compartilham **o mesmo** `horario_saida_final = 2026-04-30 20:46:34.246709+00` (valor único, provavelmente vindo de um update em lote anterior).
- O horário real da partida para a rota está em `horario_real_saida`, que é distinto por registro (ex.: 06:40, 09:21, 10:07, 10:54...).

Por isso todos exibem o mesmo "há 3h 41min" — é a diferença entre `now` e esse timestamp único.

Semanticamente, `horario_saida_final` representa a saída final/lacre (preenchida quando o veículo retorna e sai definitivamente). Para um veículo ainda **em rota**, o marco correto é `horario_real_saida` (saída para rota).

## Correção

Em `src/components/portaria/PatioAtualTab.tsx`, alterar `getMinutosNoPatio` para que, no caso `em_rota`, use `horario_real_saida` como referência (com fallback para `horario_saida_final` e depois `data_hora`, por segurança):

```ts
function getMinutosNoPatio(m: MovimentacaoPortaria, now: Date): number {
  if (isEmRota(m)) {
    const ref = m.horario_real_saida || m.horario_saida_final || m.data_hora;
    return differenceInMinutes(now, new Date(ref));
  }
  return differenceInMinutes(now, new Date(m.data_hora));
}
```

Isso afeta tanto a renderização de tabela (linha ~433) quanto a de cards mobile (linha ~296), pois ambas usam a mesma função.

## Escopo

- Edita apenas `src/components/portaria/PatioAtualTab.tsx`.
- Não mexe no banco nem em outras telas. O `horario_saida_final` corrompido nos registros `em_rota`/`retornou`/`aguardando_liberacao` deixa de impactar a UI porque passamos a usar o campo correto.
- Não altera lógica de finalizados (que continuam usando `horario_saida_final` legítimo via `computeTempos`).

## Resultado esperado

Cada linha "Em Rota" passa a mostrar o tempo real desde a saída para rota — coerente com o horário exibido na coluna "Horário".
