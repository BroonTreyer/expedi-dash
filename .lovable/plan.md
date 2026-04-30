## Mudança

Substituir o painel **"Cargas fechadas — aguardando veículo"** (canto inferior direito de `/expedicao`) por **"Cargas expedidas do dia"** — uma lista das cargas terceirizadas que **já saíram** (foram expedidas/carregadas) na data selecionada.

## Definição de "expedida"

Uma carga conta como expedida se atender a qualquer uma destas condições:
- Tem movimentação de portaria com `etapa_terceirizado === "finalizado"` (saída registrada), OU
- Tem `horario_saida_final` preenchido na movimentação, OU
- Todos os itens da carga estão com `status === "Carregado"` em `carregamentos_dia` (faturamento marcou como concluída).

A fonte base continua sendo `useCargasDiaExpedicao` (todas as cargas terceirizadas do dia, com carry-over de 30d). O hook `useStatusPortariaPorCarga` já fornece a etapa atual e o horário de saída por `carga_id`.

## Comportamento

| Situação                                                  | Aparece no novo painel |
|-----------------------------------------------------------|:----------------------:|
| Carga fechada, sem veículo previsto                       |          ❌            |
| Carga com motorista a caminho                             |          ❌            |
| Veículo no pátio carregando                               |          ❌            |
| Carga expedida (saída pela portaria) ou marcada Carregado |          ✅            |

Lista ordenada pelo horário de saída/expedição **mais recente primeiro**.

## Layout do card

Cada linha mostra:
- Nome da carga (ou `carga_id`)
- Badge verde **"Expedida"** + horário de saída (ex.: `14:32`)
- Placa, motorista, transportadora, tipo de caminhão
- Qtd pedidos, peso total (kg), data
- Borda esquerda verde para reforçar status finalizado

Estado vazio: "Nenhuma carga expedida ainda hoje".

## Arquivos

### `src/components/expedicao/PainelCargasFechadas.tsx` (renomear conceitualmente, manter arquivo)
- Trocar título para **"Cargas expedidas do dia"** com ícone `TruckIcon`/`PackageCheck`.
- Mudar o tipo da prop para receber `CargaDiaExpedicao[]` enriquecida com `horarioSaida: string | null`.
- Mostrar badge "Expedida" verde + horário formatado `HH:mm` (pt-BR).
- Manter visual de peso/pedidos/placa/motorista/transp./tipo já existente.
- Borda esquerda verde (`border-l-emerald-500`).

### `src/pages/Expedicao.tsx` (ajustar)
- Remover uso de `cargasFechadas`/`cargasTerc` para alimentar o painel.
- Construir `cargasExpedidasDoDia` combinando:
  - `cargasDoDia` (de `useCargasDiaExpedicao`)
  - `statusPortariaMap` (de `useStatusPortariaPorCarga`) → para detectar etapa `expedido` e capturar `horario_saida_final`
  - Fallback: se `c.status === "Carregado"`, considerar expedida mesmo sem registro de portaria (horário = `null` ou `horario_fim` agregado).
- Filtrar para `transportadora` preenchida (terceirizado) — já garantido pelo hook.
- Ordenar por horário de saída desc; quem não tem horário vai por último.
- Atualizar KPI **"Cargas prontas"** (4º card) para refletir o total de expedidas do dia, alinhando com a nova lista. Renomear o label do KPI para **"Cargas expedidas"**.
- Manter inalterados os painéis "No pátio", "Chegou", "A chegar" e os KPIs de peso.

### `src/components/expedicao/ExpedicaoKpiCards.tsx` (ajuste mínimo)
- Renomear label `"Cargas prontas"` → `"Cargas expedidas"`.
- Trocar ícone para `PackageCheck`.

## Notas técnicas

- Verificar se `useStatusPortariaPorCarga` retorna `horario_saida_final` no objeto. Se não retornar, estender o hook para incluir esse campo (sem mudança de schema, só `select`).
- Sem mudanças de banco de dados, RLS ou edge functions.
- `useCargasFechadasAguardando` continua existindo e em uso pelo painel da Portaria (`CargasFechadasAguardandoPanel`), só removemos o consumo na Expedição.
- Tratamento de `carga_id` reutilizado: como a base `cargasDoDia` agrupa por `carga_id+data`, e o status de portaria também é por `carga_id`, mantemos a chave composta `carga_id|data` quando houver risco de colisão entre dias diferentes.
