

# Plano Completo: Roteirização, Mapa, UX e Correções

Este é um plano extenso que cobre os 10 itens solicitados, divididos em fases implementáveis.

---

## Fase 1 — Roteirização Inteligente com OSRM (itens 1, 2, 3, 4)

### Problema atual
O mapa usa Nominatim para geocodificar cidades e traça apenas uma **linha reta** entre os pontos. Não há cálculo de rota real, nem otimização de sequência.

### Solução

**Edge Function `roteirizar`** (`supabase/functions/roteirizar/index.ts`):
- Recebe array de destinos `[{cidade, uf, cliente, lat?, lng?]`
- Geocodifica via Nominatim (com cache) se lat/lng não fornecidos
- Chama **OSRM Demo API** (`router.project-osrm.org/trip/v1/driving/...`) com parâmetro `roundtrip=false` para calcular a melhor sequência (TSP — Travelling Salesman) considerando vias reais
- Retorna: ordem otimizada, geometria da rota (polyline decodificada), distância total em km, distância por trecho

**`src/components/dashboard/RotaMap.tsx`** — Refatoração completa:
- Nova prop `routeGeometry` para receber a polyline real do OSRM (traçado de estrada)
- Exibir distância total no topo do mapa
- Exibir km por trecho ao lado de cada marker (popup)
- Para pedidos na mesma cidade: aplicar offset leve nas coordenadas (~0.002°) para evitar sobreposição
- Marcadores com início (verde), intermediários (azul numerado), final (vermelho)

**`src/components/dashboard/FechamentoLoteDialog.tsx`**:
- Adicionar campo **"Nome da Carga"** editável (item 6)
- Novo botão **"🗺️ Roteirizar"** que chama a edge function, reordena os grupos automaticamente pela sequência otimizada, e atualiza o mapa com geometria real
- Exibir painel de informações da rota: km total, km por trecho, sequência
- Botão **"Imprimir Rota"** (item 6) — gera versão impressa do mapa + sequência de paradas

**`src/pages/Index.tsx`**:
- Botão "Roteirizar" discreto ao lado de "Fechar Carga" na barra de seleção — abre o dialog de fechamento já com roteirização automática ativada

### Comportamento (item 4)
- Mapa atualiza automaticamente ao gerar rota
- Rota salva no estado ao avançar para fechamento
- Rota visível antes e durante o fechamento

---

## Fase 2 — Agrupamento por Cargas no Painel (item 7)

**`src/pages/Index.tsx`**:
- Na view "Logística OK" (toggle ativo), agrupar os registros por `carga_id`
- Cada grupo mostra: nome da carga (se houver), placa, motorista, UFs, peso total, qtd pedidos
- Botão "Imprimir Rota" em cada grupo — reconstrói a rota a partir dos destinos da carga e abre o print dialog

---

## Fase 3 — Correções de Filtros e UX (item 8)

**`src/components/dashboard/Filters.tsx`**:
- Remover cores verde/vermelho dos selects de Ruptura e Status
- Usar estilo neutro (outline/ghost) para todos os filtros
- Revisar e corrigir bugs de cascading filters (se houver)

**`src/components/dashboard/MultiSelectFilter.tsx`**:
- Verificar funcionamento correto com zero opções e limpeza

---

## Fase 4 — Contagem Correta de Pendentes Logística (item 9)

**`src/components/dashboard/KpiCards.tsx`** (linha 19):
- Atual: `source.filter(c => c.etapa === "vendas").length` — conta **itens/produtos**
- Correção: contar **pedidos únicos** por `numero_pedido`:
```typescript
const pendentesLogistica = new Set(
  source.filter(c => c.etapa === "vendas" && c.numero_pedido)
    .map(c => c.numero_pedido)
).size;
```

---

## Fase 5 — Correções e Mapa (item 5, 10)

**Mapa (`RotaMap.tsx`)**:
- Corrigir bug de renderização quando `destinos` muda rapidamente (abort ref já existe, mas validar)
- Garantir que o Leaflet CSS carrega corretamente (já importado no componente)
- Corrigir z-index do mapa dentro do dialog (z-0 já setado)

**Revisão geral de qualidade**:
- Verificar que `handleSubmit` no `FechamentoLoteDialog` inclui `nome_carga` no payload
- Verificar consistência entre `totalPedidos` vs `totalItems` em todas as telas
- Checar se o campo `nome_carga` precisa de coluna no banco (nova migração)

---

## Banco de Dados

**Nova migração** — adicionar coluna `nome_carga`:
```sql
ALTER TABLE public.carregamentos_dia 
ADD COLUMN IF NOT EXISTS nome_carga text;
```

---

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/roteirizar/index.ts` | **Novo** — Edge function para roteirização via OSRM |
| `src/components/dashboard/RotaMap.tsx` | Refatorar: rota real, km por trecho, offset para mesma cidade, marcadores diferenciados |
| `src/components/dashboard/FechamentoLoteDialog.tsx` | Campo nome_carga, botão roteirizar, painel de km, botão imprimir rota |
| `src/pages/Index.tsx` | Agrupamento por carga na view Logística OK, botão roteirizar na seleção |
| `src/components/dashboard/KpiCards.tsx` | Corrigir contagem pendentes: pedidos em vez de itens |
| `src/components/dashboard/Filters.tsx` | Cores neutras nos filtros |
| `src/components/dashboard/CargaPrintDialog.tsx` | Incluir seção de rota na impressão |
| Migração SQL | Adicionar coluna `nome_carga` |

---

## Notas técnicas

- **OSRM** (`router.project-osrm.org`) é gratuito e sem API key, suporta trip optimization (TSP) e retorna geometria real de estradas
- A edge function serve como proxy para evitar CORS e cachear resultados
- O mapa continua usando Leaflet/react-leaflet (já instalados)
- A roteirização é chamada sob demanda (botão), não automática ao abrir o dialog, para evitar chamadas desnecessárias

