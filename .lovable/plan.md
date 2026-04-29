## Objetivo
Separar a página **Rupturas** em duas abas com propósitos distintos:

1. **Faltando agora** — visão operacional ao vivo, somente itens com `ruptura = true` em aberto.
2. **Histórico do mês** — visão analítica acumulada por produto, contabilizando todo evento de ruptura que ocorreu no mês selecionado (mesmo os já resolvidos).

## Comportamento de cada aba

### Aba 1 — "Faltando agora"
- **Filtro:** apenas registros onde `ruptura = true` (ruptura total marcada).
- **Sem filtro de data** — mostra o estado atual, independente de quando o pedido foi criado.
- **Dinâmico:** se o operador desmarcar a ruptura ou repor o item, ele desaparece da lista. Se uma nova ruptura for marcada, aparece. O número sobe e desce em tempo real (realtime já existe).
- **Layout:** mantém a tabela atual (cliente, produto, peso faltante, pedido, carga, vendedor) + KPIs no topo:
  - Itens em ruptura agora
  - Peso total faltando agora (kg / ton)
  - Pedidos únicos afetados
- **Ações:** mantém edição, exclusão, impressão, deep-link `?carga=...`.
- **Itens com peso parcial editado** (peso < peso_original mas `ruptura = false`) **não aparecem aqui** — vão só para o histórico.

### Aba 2 — "Histórico do mês"
- **Seletor de mês** no topo (default: mês corrente, navegação ← / → para meses anteriores).
- **Filtro:** todo registro com evento de ruptura no mês — `ruptura_sinalizada = true` OU (`peso_original > peso`) OU `ruptura = true`, com `data` dentro do mês selecionado.
- **Acumula tudo:** mesmo se o item foi reposto depois, conta a perda original. Não some da lista.
- **Visão principal — agrupada por produto:**
  - Tabela: Código | Produto | Nº ocorrências | Peso/Qtd faltado total | Clientes afetados (únicos) | Última ocorrência
  - Ordenação default: maior peso faltado primeiro.
  - Click no produto expande/abre detalhe com todas as ocorrências (cliente, pedido, data, peso faltado, motivo, status atual).
- **KPIs do mês:**
  - Total de eventos de ruptura
  - Peso total faltado no mês (kg / ton)
  - Produto mais crítico
  - Cliente mais impactado
- **Export:** botão para baixar Excel do agrupado + detalhado (reaproveita lógica existente de export).

## Estrutura técnica

```text
src/pages/Rupturas.tsx
  └─ <Tabs>
       ├─ <TabsContent value="atual">    → <RupturasAtual />
       └─ <TabsContent value="historico"> → <RupturasHistorico />
```

- Criar dois componentes em `src/components/rupturas/`:
  - `RupturasAtual.tsx` — extrai a lógica/UI atual, mas filtra estritamente `ruptura === true`. Remove dependência de `peso_original < peso` na contagem.
  - `RupturasHistorico.tsx` — novo. Hook próprio `useRupturasHistoricoMes(ano, mes)` que consulta `carregamentos_dia` por intervalo de data e filtra eventos de ruptura.
- Atualizar `src/lib/peso-utils.ts` se necessário para expor um helper `temEventoRuptura(item)` (true quando `ruptura === true` ou `peso_original > peso`).
- O KPI card global do dashboard (`KpiCards.tsx`) continua usando `ruptura === true` (já está correto após o último ajuste).
- Manter realtime na aba "Faltando agora" (subscription em `carregamentos_dia` com debounce 1.5s já existente).

## Fora do escopo
- Não mexer em triggers/DB. A coluna `ruptura_sinalizada` já é setada pelo trigger `set_ruptura_sinalizada` e serve como fonte para o histórico.
- Não migrar dados antigos.
- O alerta de inconsistência do "Pedido #48" (peso_original replicado) sai da tela — vira responsabilidade do histórico só (onde o impacto fica isolado, não inflando o "agora").

## Resultado esperado
- "Faltando agora" reflete fielmente a operação: sobe quando alguém marca ruptura, desce quando resolve.
- "Histórico do mês" preserva a memória do que faltou, agrupado por produto, navegável mês a mês.