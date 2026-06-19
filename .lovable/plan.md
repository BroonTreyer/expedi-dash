# Auditoria — Painel Expedição

## Diagnóstico do caso "André"

Movimentação no banco (placa HBR9J69 / MOREIRA / carga `CG-20260617-103335-RBZ`):
- Entrada: 18/06 14:13 — etapa `finalizado`
- Saída: 19/06 11:41 (`horario_saida_final`)

Resultado esperado: aparecer hoje (19/06) no painel **"Cargas expedidas do dia"**.
Resultado real: **não aparece em lugar nenhum.**

**Causa raiz:** o `carga_id` `CG-20260617-103335-RBZ` **não existe mais** em `carregamentos_dia` (foi apagado/limpo). O painel "Cargas expedidas do dia" e os KPIs de peso (`useCargasDiaExpedicao`) são construídos a partir de `carregamentos_dia` — se a carga sumiu, a saída pela portaria some junto, mesmo havendo `horario_saida_final` registrado em `movimentacoes_portaria`.

Hoje há **1 movimentação órfã** nessa situação (a do André). Conforme as cargas vão sendo apagadas/reabertas, esse problema tende a se repetir.

## Outros pontos detectados na auditoria

1. **Sem fallback para cargas órfãs** — qualquer carga terceirizada cuja saída foi registrada hoje mas que não existe (ou foi excluída) em `carregamentos_dia` desaparece do painel. Não há registro visível para o operador.
2. **Sem realtime no `useCargasDiaExpedicao` para `movimentacoes_portaria` mudando `horario_saida_final`** — já existe, mas o painel só re-renderiza quando o React Query invalida; ok.
3. **`tipo_movimento = "saida"` solto** (sem entrada correspondente) não é exibido em nenhum painel — só é considerado pelo `useStatusPortariaPorCarga` se houver entrada do mesmo `carga_id`. No caso do André a entrada existe, então isso está ok; o problema é só a carga órfã.
4. **Filtro `transportadora` em `useCargasDiaExpedicao`** descarta linhas sem transportadora preenchida. Se um item da carga ficou sem transportadora, a carga inteira pode ser descartada do agrupamento. Vale revisar.

## Correções propostas

### A. Fallback para saídas de cargas órfãs (principal)

Em `src/hooks/useCargasDiaExpedicao.ts`, depois de montar `cargaIdsSaidaHoje`:
- Para `carga_id`s que saíram hoje mas **não estão** em `carregamentos_dia` em nenhum dia (carga totalmente apagada), criar uma "carga sintética" mínima a partir de `movimentacoes_portaria`:
  - `carga_id`, `placa`, `motorista`, `transportadora` (de `empresa`), `tipo_caminhao`, `data = dateStr`, `pesoTotal = 0`, `qtdPedidos = 0`, `status = "Expedido (sem pedidos)"`.
- Marcar essas linhas com um flag (`orfa: true`) para o `PainelCargasFechadas` exibir um badge "Pedidos apagados" e o card não somar nos KPIs de peso (já é 0).

Resultado: o André aparece em "Cargas expedidas do dia" com badge informativo, mesmo sem `carregamentos_dia`.

### B. Tornar `PainelCargasFechadas` tolerante ao flag `orfa`

Em `src/components/expedicao/PainelCargasFechadas.tsx`: quando `c.orfa`, exibir badge amber "Pedidos apagados — saída registrada na portaria" no card.

### C. Auditoria de cargas órfãs

Adicionar um pequeno log (toast/dev) ou contador no topo do painel quando houver cargas órfãs do dia, para a Logística saber que precisa investigar.

### D. Revisão do filtro `transportadora` (menor)

Em `useCargasDiaExpedicao` linha 162 (`if (!r.transportadora) continue;`), trocar por: tratar a carga como terceirizada se **qualquer** item tiver transportadora preenchida, em vez de descartar item a item. Isso evita perder cargas com 1 linha sem transportadora.

## Validação

1. Recarregar `/expedicao` na data 19/06.
2. Confirmar que o card do André (placa HBR9J69, MOREIRA, carga CG-20260617-103335-RBZ) aparece em "Cargas expedidas do dia" com badge "Pedidos apagados".
3. KPI "Cargas fechadas" passa de N → N+1; KPI "kg Carregado" não muda (peso 0).
4. Reabrir um pedido qualquer e verificar que continua aparecendo normalmente nos demais painéis.

## Fora do escopo

- Restaurar a carga `CG-20260617-103335-RBZ` em `carregamentos_dia` (foi apagada; se for o caso, fazemos em conversa separada via snapshot/restore).
- Mudanças no fluxo da portaria ou em `movimentacoes_portaria`.
