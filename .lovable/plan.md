## Correção do contador "Conferidos" em Veículos Esperados

**Problema:** o badge mostra `146/158 conferidos` somando todas as datas já importadas (Carga Própria), porque o hook usa `showAll: true`. A lista visível filtra `!conferido`, mas o contador no header não respeita data.

**Solução (opção 1):** manter `showAll: true` (preserva avisos "Saída dd/MM" e "Atrasado"), e calcular os contadores no `VeiculosEsperadosPanel` apenas sobre veículos com `data_referencia === dataFiltrada`.

### Mudanças

**`src/components/portaria/VeiculosEsperadosPanel.tsx`**
- Derivar `veiculosDoDia = veiculos.filter(v => !dataFiltrada || v.data_referencia === dataFiltrada)`.
- Usar `veiculosDoDia` para calcular `totalConferidos`, `pendentes` e o total exibido (`X/Y conferidos`).
- A lista renderizada (`filtered`) e a aba "Esperados" continuam mostrando pendentes de outras datas (futuras/atrasadas) — só o contador passa a refletir o dia filtrado.
- Ajustar a condição `pendentes === 0` para usar a contagem do dia.

### Resultado esperado

Hoje (05/05) o badge passará a mostrar `9/21 conferidos` + `12 pendentes`, em vez de `146/158`.