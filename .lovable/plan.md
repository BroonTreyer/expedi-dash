# Corrigir adiantamentos das OCs 131170 / 131175

## Diagnóstico (confirmado no banco)
Na importação do DACTE (02/07), a extração gravou **o peso no lugar do valor do frete** nos 3 CT-es dessas duas ordens — os dois campos ficaram com o mesmo número:

| OC | CT-e | valor_frete gravado | peso (kg) |
|---|---|---|---|
| 131170 | 1040 | 2.368,00 | 2.368 |
| 131170 | 1041 | 1.472,00 | 1.472 |
| 131175 | 1042 | 9.022,00 | 9.022 |

Como o adiantamento é 80% do valor dos CT-es, todos os valores derivados (adiantamento e saldo) ficaram errados. Não é erro de tela nem de cálculo — o dado de origem está errado.

## Correção dos dados
Valor real do frete das duas ordens juntas: **R$ 30.604,00**, com adiantamento de 80% = **R$ 24.483,20** e saldo **R$ 6.120,80** (data do adiantamento 02/07/2026, data do saldo 21/07/2026).

- Ratear os R$ 30.604,00 entre os 3 CT-es proporcionalmente ao peso (peso total 12.862 kg), corrigindo `valor_frete` de cada CT-e e o valor no vínculo do adiantamento.
- Consolidar em **um único adiantamento** cobrindo os 3 CT-es (as duas OCs juntas), com: 3 CT-es, peso 12.862 kg, valor total 30.604,00, 80%, adiantamento 24.483,20, saldo 6.120,80, status quitado, pago em 02/07/2026 e quitado em 21/07/2026.
- Remover os adiantamentos duplicados que sobram (ADT-20260702-003/004/005 consolidados em um só), preservando os CT-es.

## Prevenção
- **Alerta de valor suspeito:** ao importar/listar CT-es, quando `valor_frete` for igual ao `peso_total` (ou o valor por kg ficar fora de faixa razoável), mostrar um aviso visível "verificar valor do frete" no CT-e e no card do adiantamento.
- **Edição do valor do frete:** permitir editar o valor do frete de um CT-e direto na aba CT-es, recalculando automaticamente o adiantamento vinculado (valor total, adiantamento e saldo), no mesmo estilo do "peso manual" já existente.

## Detalhes técnicos
- Correção de dados via SQL (update em `ctes_dacte.valor_frete`, `adiantamentos_frete_ctes.valor_frete`, consolidação em `adiantamentos_frete`).
- `src/components/logistica/CtesDacteTab.tsx`: badge de alerta + diálogo/input para editar `valor_frete`.
- `src/hooks/useCtesDacte.ts`: mutation `useAtualizarValorFreteCte` que atualiza o CT-e, o pivot e recalcula o header do adiantamento.
- `src/components/logistica/AdiantamentosTab.tsx`: aviso quando algum CT-e do adiantamento estiver com valor suspeito.
- `supabase/functions/parse-dacte-pdf/index.ts`: reforçar no prompt que `valor_frete` nunca é igual ao peso e nunca vem do campo de peso.
