## Problema

A aba **Esperados** mostra badge `2`, mas o painel exibe "✅ Todos os veículos foram conferidos!" e esconde a lista. No banco, os 2 pendentes do grupo `TERCEIRIZADO` são do dia anterior (Rodrigo ONC6549 e Joares FGE2G81, `data_referencia=2026-06-11`).

**Causa**: em `src/components/portaria/VeiculosEsperadosPanel.tsx`, o curto-circuito de "tudo conferido" usa `pendentes`, que é calculado **apenas sobre veículos com `data_referencia == dataFiltrada` (hoje)**. O badge da aba conta pendentes de qualquer data (atrasados e futuros). Resultado: quando todos os pendentes são atrasados/futuros, o painel some, mas o contador continua aparecendo — exatamente o "veículo fantasma" que o usuário está vendo.

## Mudança

### `src/components/portaria/VeiculosEsperadosPanel.tsx`

Trocar a condição de "lista vazia" do header de `if (pendentes === 0)` para basear na lista que realmente seria renderizada (`pendingVeiculos`, que já considera qualquer data):

- Se `pendingVeiculos.length === 0` → renderiza o card com "Todos conferidos".
- Caso contrário, renderiza a tabela normal. A contagem `{totalConferidos}/{totalDoDia}` no header continua representando "do dia"; adicionar, ao lado, um badge discreto "X atrasados" quando `pendingVeiculos.length > totalDoDia - totalConferidos` para deixar claro o motivo dos pendentes não estarem entre os "do dia".

Sem mexer em hooks, schema, ou no badge do tab — só corrige o painel para mostrar os atrasados que ele já tem em mãos.

## Fora de escopo

- Não apagar registros antigos de `veiculos_esperados`. Atrasados continuam visíveis para a Logística decidir (conferir manualmente ou excluir pela seleção em massa).
