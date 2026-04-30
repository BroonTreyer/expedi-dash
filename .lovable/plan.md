# Corrigir duplicidade entre "A chegar" e "Cargas fechadas"

## Problema

A carga **DICKSON J BATISTA** (placa OZR0D10) aparece simultaneamente em:
- **A chegar** (veículo previsto, ainda não conferido)
- **Cargas fechadas — aguardando veículo**

Isso acontece porque, ao fechar a carga terceirizada, o sistema já cria automaticamente uma previsão em `veiculos_esperados` (memória *portaria-automated-forecasts*). Hoje o painel "Cargas fechadas" lista qualquer carga em `etapa='logistica'` sem entrada de portaria — sem checar se já existe veículo previsto.

## Regra correta

- **Cargas fechadas — aguardando veículo** → SOMENTE cargas fechadas que ainda **não têm veículo vinculado** (sem registro em `veiculos_esperados`).
- **A chegar** → cargas fechadas que **já têm veículo previsto** e ainda não chegaram à portaria.

## Mudança técnica

### `src/hooks/useCarregamentos.ts` — `useCargasFechadasAguardando`

Após buscar as cargas em `etapa='logistica'`, fazer uma query adicional em `veiculos_esperados`:

```ts
const { data: previstos } = await supabase
  .from("veiculos_esperados")
  .select("carga_id")
  .in("carga_id", cargaIds)
  .eq("grupo", "TERCEIRIZADO");

const cargasComVeiculoPrevisto = new Set(
  (previstos ?? []).map((v) => v.carga_id).filter(Boolean)
);
```

No loop que monta `grouped` (linhas ~501-527), adicionar:

```ts
if (cargasComVeiculoPrevisto.has(c.carga_id)) continue;
```

Assim, qualquer carga já com previsão em `veiculos_esperados` (independente de `conferido`/`status_autorizacao`) sai do painel "Cargas fechadas". Ela continuará aparecendo em "A chegar" enquanto `conferido=false`, e migrará naturalmente para "Chegou" / "No pátio" quando a portaria registrar a chegada.

## Resultado esperado

- **DICKSON J BATISTA** → some de "Cargas fechadas", permanece em "A chegar".
- **JR MIX**, **SENDAS FEIRA DE SANTANA** → continuam em "Cargas fechadas" (não têm `veiculos_esperados`).
- KPIs de peso (Consolidado) não são afetados — usam `useCargasDiaExpedicao` com lógica própria.

## Arquivos a editar

- `src/hooks/useCarregamentos.ts` (apenas a função `useCargasFechadasAguardando`)
