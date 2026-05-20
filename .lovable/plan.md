## Diagnóstico

GLADSON aparece em **No Pátio** e em **Cargas expedidas do dia** ao mesmo tempo porque os dois painéis usam fontes de verdade diferentes:

- **Cargas expedidas do dia** (`Expedicao.tsx → cargasExpedidasDoDia`): considera expedida quando `status === 'Carregado'` (faturamento) **OU** `etapa portaria === 'expedido'`.
- **No Pátio** (`PainelNoPatio`): olha só a movimentação de portaria — basta ter `horario_entrada` e `etapa_terceirizado !== 'finalizado'`.

No caso do GLADSON, o faturamento marcou a carga como **Carregado** (entra em "Cargas expedidas"), mas a portaria ainda não finalizou o movimento (continua em "No Pátio"). Resultado: aparece nos dois painéis.

## Correção

Em `src/pages/Expedicao.tsx`, depois de calcular `cargasExpedidasDoDia`, construir um `Set` de chaves `carga_id|placa(uppercase)` das cargas expedidas e filtrar `movimentacoesComPeso` antes de passá-las aos painéis **No Pátio** e **Chegou — aguardando liberação**.

Assim, qualquer carga já contada como expedida (seja por portaria, seja por faturamento) some dos painéis "No Pátio" / "Chegou" automaticamente — mantendo uma única fonte de verdade.

## Escopo

- Único arquivo afetado: `src/pages/Expedicao.tsx`.
- Não muda `PainelNoPatio`, `PainelChegou`, hooks, RLS ou banco.
- Não altera o KPI de peso (já usa a mesma lógica de `cargasExpedidasDoDia`).

## Verificação

- Reabrir `/expedicao`: GLADSON deve aparecer apenas em "Cargas expedidas do dia".
- Quando a portaria finalizar a saída, o comportamento continua o mesmo (a carga sai de "No Pátio" pelos dois critérios).
