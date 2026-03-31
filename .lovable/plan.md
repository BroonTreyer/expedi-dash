

# Corrigir: Veículos Atrasados Não Aparecem na Query

## Problema

A query busca veículos com `data_referencia >= dataFiltrada` (para frente). Veículos com data passada (ex: carga do dia 30 quando o filtro é dia 31) nunca são carregados — por isso os badges de "Atrasado" nunca aparecem.

## Solução

Expandir a janela da query para incluir também veículos **pendentes de dias anteriores** (não conferidos). Buscar de `dataFiltrada - 3 dias` até `dataFiltrada + 3 dias`.

### Mudança em `src/hooks/useVeiculosEsperados.ts`

Na função `useVeiculosEsperados`:
- Calcular `dataInicio` = `dataReferencia - 3 dias`
- Manter `dataLimite` = `dataReferencia + 3 dias`
- Alterar `.gte("data_referencia", dataReferencia)` para `.gte("data_referencia", dataInicio)`
- Atualizar a `queryKey` para incluir `dataInicio`

Assim, veículos com carga prevista para o dia 30 aparecerão quando o filtro estiver no dia 31, com o badge vermelho "Atrasado 30/03".

| Arquivo | Mudança |
|---|---|
| `src/hooks/useVeiculosEsperados.ts` | Expandir janela da query para `dataReferencia - 3 dias` até `dataReferencia + 3 dias` |

