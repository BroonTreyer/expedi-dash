

## Status Portaria Terceirizados ↔ Consolidado: integração ponta-a-ponta

### Diagnóstico

A página `/consolidado` agrupa cargas finalizadas por `carga_id` mas hoje só mostra dados logísticos (placa, motorista, peso, status do pedido). **Não há nenhuma visão do que está acontecendo na portaria**: o usuário não sabe se o terceirizado já chegou, se está carregando, se já saiu ou ainda está aguardando.

A informação existe em `movimentacoes_portaria` (campos `tipo_movimento`, `etapa_terceirizado`, `horario_entrada`, `data_hora`, `carga_id`) e está indexada por `carga_id` — basta cruzar.

### Modelo de "Etapa Portaria" para terceirizados (derivada)

Para cada `carga_id` agrupado no Consolidado, derivo **uma etapa única** consultando todas as movimentações daquela carga e aplicando regras na ordem (a "mais avançada" vence):

| Etapa Portaria | Regra de derivação | Cor / Ícone |
|---|---|---|
| **Aguardando chegada** | Carga fechada, **nenhum** registro em `movimentacoes_portaria` para esse `carga_id` | cinza / `Clock` |
| **No pátio** | Existe `tipo_movimento='entrada'` (ou `etapa_terceirizado='chegada'`), sem etapa posterior | azul / `ParkingCircle` |
| **Carregando** | `etapa_terceirizado='liberado'` **ou** status logístico = "Carregando" enquanto veículo no pátio | âmbar / `Package` |
| **Expedido / Finalizado** | Existe `tipo_movimento='saida'` **ou** `etapa_terceirizado='finalizado'` **ou** `horario_saida_final` preenchido | verde / `CheckCircle2` |

> Foco apenas em **terceirizados** (categoria `terceirizado` nas movimentações). Cargas próprias mantêm o badge atual (sem este novo indicador).

### Mudança 1 — novo hook `useStatusPortariaPorCarga(cargaIds)`

Arquivo novo: **`src/hooks/useStatusPortariaPorCarga.ts`**

- Recebe `cargaIds: string[]` ativos no Consolidado.
- **Uma única query batch**: `movimentacoes_portaria.select("carga_id, tipo_movimento, categoria, etapa_terceirizado, horario_entrada, horario_saida_final, data_hora").in("carga_id", cargaIds).eq("categoria", "terceirizado")`.
- Agrupa por `carga_id` em `Map<string, StatusPortariaInfo>` aplicando a tabela acima.
- Retorna `{ etapa, label, iconKey, colorClass, timestamps: { chegada, saida } }`.
- **Realtime**: subscreve `movimentacoes_portaria` com debounce de 1.5s (regra global) e invalida o cache.
- Protegido por `enabled: !!session && cargaIds.length > 0`.
- Performance: `Map` pré-indexado (lookup O(1)), `useMemo` para derivar etapas.

### Mudança 2 — novo componente `<PortariaStatusBadge>`

Arquivo novo: **`src/components/dashboard/PortariaStatusBadge.tsx`**

- Recebe `etapa` + `timestamps` opcionais.
- Renderiza Badge no mesmo padrão visual do `StatusBadge`/`EtapaBadge` (consistência com `style/ui-components`): outline com cor semântica + ícone Lucide à esquerda.
- **Tooltip** mostra horários reais quando existirem ("Chegou às 09:42 · Saiu às 11:05").
- Variante discreta (cinza claro) para "Aguardando chegada".

### Mudança 3 — integrar em `src/pages/Consolidado.tsx`

a) **3 KPIs novos** ao lado dos atuais (Veículos / Peso / Pedidos):
   - **"No pátio"** — cargas com etapa `No pátio` ou `Carregando`.
   - **"Carregando"** — cargas com etapa `Carregando`.
   - **"Expedidos"** — cargas com etapa `Expedido / Finalizado`.
   
   Layout: `grid-cols-3 sm:grid-cols-6` (3 originais + 3 portaria). Mobile: 2 linhas de 3.

b) **Coluna "Portaria"** na tabela desktop, entre **Status** e **Tipo**:
   - Renderiza `<PortariaStatusBadge>`.
   - **Sortable** por etapa (ordem cronológica: Aguardando → Pátio → Carregando → Expedido).

c) **Card mobile**: linha extra `Portaria: <badge>` no grid de informações da carga.

d) **Filtro novo "Etapa Portaria"** no topo (Select), com opções: Todas / Aguardando chegada / No pátio / Carregando / Expedido.

e) **Linha expandida (detalhes)**: abaixo dos itens da carga, mini-timeline com horários (chegada → saída) reaproveitando visual do `AuditTimeline`.

### Mudança 4 — Realtime cross-table

O hook `useConsolidado` já subscreve `carregamentos_dia`. O novo hook adiciona subscrição a `movimentacoes_portaria` filtrando `categoria=terceirizado` — quando portaria registra entrada/saída, o badge **atualiza automaticamente** sem refresh, em ≤1.5s.

### Performance

- **Uma query batch** para todas as `carga_id` visíveis (sem N+1).
- `Map` pré-indexado por `carga_id` (`tech/performance/data-grouping`).
- `useMemo` no derivar de etapa para evitar recomputação.
- Debounce de 1.5s no realtime (`tech/realtime-concurrency`).

### Validação (cenários)

1. Carga fechada, nada na portaria → badge cinza "Aguardando chegada", KPIs zerados.
2. Portaria registra entrada terceirizado → badge azul "No pátio", KPI "No pátio" incrementa em ≤1.5s.
3. Status logístico muda para "Carregando" + veículo no pátio → badge âmbar "Carregando".
4. Portaria registra saída (`tipo_movimento='saida'` ou `etapa_terceirizado='finalizado'`) → badge verde "Expedido", KPI "Expedidos" incrementa.
5. Filtro "Etapa Portaria = Carregando" mostra só as cargas em pátio sendo carregadas.
6. Tooltip do badge mostra horário de chegada e saída quando disponíveis.
7. Mobile: linha "Portaria:" aparece no card.
8. Linha expandida: timeline com chegada/saída.

### Fora do escopo

- Cargas próprias (mantêm o fluxo atual sem este novo badge).
- Mudar trigger `on_carga_fechada` ou criar coluna persistida — derivamos no front.
- Editar registros da Portaria a partir do Consolidado (apenas leitura).
- Outras telas (Painel principal, Kanban).

### Resultado

A página `/consolidado` passa a ser a **visão única ponta-a-ponta** do ciclo do terceirizado: do fechamento da carga (Logística) até a expedição final (Portaria). Em uma linha o usuário enxerga quem está aguardando, quem está no pátio, quem está carregando e quem já saiu — com KPIs no topo, badges coloridos por linha, filtro dedicado, timeline nos detalhes e atualização em tempo real.

