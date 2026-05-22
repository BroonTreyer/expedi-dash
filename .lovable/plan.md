# Linha do tempo do pedido — Distribuidores

## Escopo

Apenas pedidos de clientes marcados como **distribuidor**. Demais clientes seguem sem alteração.

## Marcos rastreados (fluxo final)

1. **Pedido registrado** — `carregamentos_dia.created_at`
2. **Pré-carga fechada** — primeira vez que o pedido recebeu `carga_id` (lido do `audit_log` ou, se ausente, do `created_at` do registro do carga_id)
3. **Previsão de carregar** — `carregamentos_dia.data` da carga (data planejada de carregamento)
4. **Chegada na portaria** — `movimentacoes_portaria.horario_chegada` da carga
5. **Entrada no pátio** — `movimentacoes_portaria.horario_entrada`
6. **Expedido** — `movimentacoes_portaria.horario_real_saida` (ou `horario_saida_final` quando finalizado)

Resumo de tempos calculado entre cada marco + ciclo total (registrado → expedido).

## Identificação de distribuidor

`clientes` hoje não tem campo de tipo. Adicionar:

- Migração: `ALTER TABLE clientes ADD COLUMN tipo text DEFAULT 'outros'` (`'distribuidor' | 'varejo' | 'outros'`).
- Cadastro de cliente ganha seletor "Tipo".
- Aba "Distribuidores" na página de clientes para marcar em lote os atuais.
- Pedido é "de distribuidor" quando `carregamentos_dia.codigo_cliente` corresponde a um cliente com `tipo = 'distribuidor'`.

## Onde aparece

**A. Página `/distribuidores`** (item lateral para admin / logística / faturamento)
- Lista clientes distribuidor com seus pedidos em aberto + últimos 30 dias finalizados.
- Filtros: cliente, período, situação (em aberto / expedido / com ruptura).
- KPIs no topo: ciclo médio, tempo médio em pré-carga, tempo médio em pátio, tempo médio até expedição.

**B. Drawer "Linha do tempo"** (Sheet lateral, reutilizável)
- Timeline vertical com os 6 marcos, cada um com data/hora pt-BR e "há X".
- Marco futuro/pendente aparece em cinza com "—".
- Rodapé: *Ciclo total: 1d 4h · Pré-carga → expedido: 22h · Pátio: 1h 20min*.
- Botão "Exportar XLSX" do pedido.

**C. Sinalização discreta nas telas existentes**
- Em Pré-cargas, Dashboard e Expedição: pedidos de distribuidor ganham chip "Distribuidor" (neutro, não vermelho) e ícone de relógio que abre o drawer.
- Nenhuma alteração no fluxo para outros clientes.

## Como os dados são reunidos

Hook `useTimelinePedidoDistribuidor(pedidoId | cargaId)` lê em paralelo:

```text
1. carregamentos_dia → created_at, data, carga_id, codigo_cliente, etapa
2. audit_log → eventos do entity_id (para descobrir o instante exato em que carga_id foi atribuído)
3. movimentacoes_portaria por carga_id → horario_chegada, horario_entrada, horario_real_saida, horario_saida_final
4. clientes → tipo (confirma que é distribuidor)
```

Helper `montarTimelineDistribuidor()` em `src/lib/timeline-utils.ts`:
- Monta a lista fixa de 6 marcos (sem variantes).
- Reaproveita `formatarDuracao` (já existe).

## Arquivos e migração

- `supabase/migrations/...` — adiciona `clientes.tipo` + índice.
- `src/lib/timeline-utils.ts` — montagem e durações.
- `src/hooks/useTimelinePedidoDistribuidor.ts`
- `src/hooks/useDistribuidores.ts`
- `src/components/timeline/TimelineDrawer.tsx` + `TimelineMarcador.tsx`
- `src/pages/Distribuidores.tsx`
- Ajustes em `src/components/clientes/...` (seletor de tipo).
- Item "Distribuidores" no `AppSidebar`.

## Fora do escopo

- Não criamos tabela de eventos nova — usamos `audit_log` + colunas já existentes.
- Não mexemos em RLS nem em fluxo de portaria.
- Pedidos anteriores ao audit_log completo mostram aviso "histórico parcial".
