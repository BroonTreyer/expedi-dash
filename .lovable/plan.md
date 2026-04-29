## Problema

Em **Consolidado**, o badge da Portaria para cargas **terceirizadas** não acompanha corretamente os passos "chegou" e "entrou no pátio". Mesmo quando o porteiro libera o veículo (`etapa_terceirizado = 'no_patio'`), o badge continua exibindo "Aguardando chegada".

## Causa

No hook `src/hooks/useStatusPortariaPorCarga.ts`, a função `deriveEtapa` só conhece dois valores de `etapa_terceirizado`:

- `'chegada'` (sem `horario_entrada`) → `aguardando`
- `'liberado'` → `carregando`

Os valores `'no_patio'` e `'finalizado'` não são mapeados. Como resultado:

- Após "Liberar entrada no pátio" (que grava `etapa_terceirizado = 'no_patio'` + `horario_entrada`), a etapa cai no fallback genérico — funciona às vezes, mas só se `horario_entrada` estiver presente. E o label correto "No pátio" não aparece de forma confiável quando o caminhão depois passa para `liberado` e voltaria, etc.
- `'finalizado'` só é interpretado como "Expedido" via fallback de `tipo_movimento='saida'`/`horario_saida_final`, podendo ficar atrás na ordem se o registro de saída ainda não existir.

Fluxo terceirizado oficial (já documentado em memória): **chegada → no_patio → liberado → finalizado**.

## Solução (apenas terceirizado, carga própria fica como está)

Atualizar `deriveEtapa` em `src/hooks/useStatusPortariaPorCarga.ts` para mapear explicitamente os 4 estágios:

| `etapa_terceirizado` / sinal      | Etapa exibida   | Label              |
|-----------------------------------|-----------------|--------------------|
| `'chegada'` (sem `horario_entrada`) | `aguardando`  | Aguardando chegada |
| `'no_patio'` ou `horario_entrada` preenchido | `patio` | No pátio          |
| `'liberado'`                      | `carregando`    | Carregando         |
| `'finalizado'` ou `horario_saida_final` ou `tipo_movimento='saida'` | `expedido` | Expedido |

A lógica de "etapa máxima" entre todos os movimentos da mesma `carga_id` continua igual (via `ORDEM`), assim como o filtro `categoria = 'terceirizado'` na query e no canal Realtime — nada muda para carga própria.

## Arquivo afetado

- `src/hooks/useStatusPortariaPorCarga.ts` — único ajuste, dentro de `deriveEtapa`.

## Resultado esperado

No Consolidado, o badge da Portaria para cargas terceirizadas passa a refletir corretamente cada etapa em tempo real:

- Aguardando chegada → No pátio → Carregando → Expedido
