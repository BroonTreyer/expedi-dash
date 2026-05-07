## Visão geral

Refatoração completa do fluxo de Fechar Carga (Roteirização → Fechamento → Mapa) corrigindo bugs conhecidos e adicionando 4 funcionalidades pedidas: **custo de combustível automático (API ANP)**, **tempo total + horário previsto de retorno**, **comparação rota manual vs otimizada** e **histórico de rotas executadas (km real vs planejado)**, além do mapa dinâmico com zoom no scroll.

---

## 1. Correções de bugs

### 1.1 Reordenação não salva — dois pontos

**A) Dentro do diálogo Roteirização:** ao reordenar manualmente (drag, setas, input), depois clicar em **Roteirizar**, a otimização sobrescreve a ordem do usuário. Solução: detectar reordenação manual e:
- Marcar grupo como "ordem manual" → botão Roteirizar passa a se chamar **"Otimizar do zero"** com confirmação.
- Adicionar botão extra **"Recalcular trajeto (manter ordem)"** que chama o backend só para gerar geometria/km/tempo da ordem atual sem reotimizar.

**B) Após "Avançar para Fechar Carga":** `ordem_entrega` é enviada por grupo, mas todos os itens de um mesmo cliente recebem a mesma `ordem`. Bug real: quando o usuário reordena dentro de Fechamento (não há UI hoje, mas a ordem vinda do roteirizacao não é persistida no estado se o dialog re-renderiza). Vou:
- Garantir que `groups` no `FechamentoLoteDialog` venha sempre de `roteirizacao.groups` (já vem) e mostrar a ordem visualmente.
- Adicionar reordenação por arrastar também dentro de Fechar Carga (mesma UX).
- Confirmar via log do `batchUpdateMut` que `ordem_entrega` está chegando ao banco com valor correto por linha.

### 1.2 Mapa não mostra trajeto

Quando a edge function retorna `geometria` mas o frontend filtra `[0,0]` e fica vazio, ou quando o `routeGeometry` é resetado por mudança de `citySetKey` durante o loading. Corrigir:
- Não resetar `routeGeometry` quando o usuário só altera filtros de exibição (apenas em reordenação real).
- Adicionar fallback de polyline reta entre cidades quando não houver geometria detalhada.
- Log claro no toast quando ORS falha (`estimado=true`) para o usuário entender por que o trajeto está como linha reta.

### 1.3 Bugs visuais

- Markers do mapa cortados nas bordas → aumentar `padding` do `fitBounds` (40 → 60) e adicionar `maxZoom: 12`.
- Popup do trecho passando do limite no mobile.
- Trecho card mostra "→ km · tempo até próximo" mesmo no último destino → esconder no último.
- Badge de "Distância estimada" colidindo com KPIs no mobile → quebra de linha.
- Loading overlay do mapa cobre a legenda → mover overlay para apenas a área `<MapContainer>`.

### 1.4 Mapa dinâmico

- `scrollWheelZoom={true}` (hoje está `false`) — zoom com scroll.
- Adicionar controles de zoom (`+/-`) e botão **"Centralizar rota"**.
- Modo **fullscreen** (botão expande para `h-[80vh]`).
- Tile layer alternativo selecionável: padrão (OSM), satélite (Esri).

---

## 2. Custo de combustível (API ANP)

**Edge function nova: `combustivel-preco`**
- Busca preço médio de Diesel S10 no estado da origem via API pública: `https://app4.anp.gov.br/api/sistema-levantamento-precos/v1/precos-medios-municipais` (gratuita, atualiza semanal).
- Cacheia em nova tabela `combustivel_precos` (uf, tipo, valor_litro, atualizado_em) por 7 dias.
- Frontend chama na abertura da Roteirização e exibe o preço usado.

**Cálculo no frontend:**
- `custo = (km_total / consumo_km_litro) × valor_litro`
- `consumo_km_litro` vem de `tipos_caminhao.consumo_km_litro` (já existe).
- Mostrado no badge ⛽ (já há suporte no `RotaMap`, só preciso popular).
- Selector de tipo de caminhão dentro da Roteirização para o usuário trocar e ver o impacto.

---

## 3. Tempo total + horário previsto de retorno

- Soma de `trechos[].duracao` + tempo médio de descarga por parada (configurável via `app_settings`, default 30 min).
- Campo "Horário previsto de saída" + cálculo automático de horário de retorno.
- Exibido no header do `RotaMap` ao lado de km e custo.

---

## 4. Comparação manual vs otimizada

- Ao apertar **Otimizar**, salvar snapshot da ordem/km/custo "antes".
- Banner verde com **"Economia: −47 km · −R$ 38,20 · −1h12min"** se a otimização melhorou.
- Botão **"Desfazer otimização"** restaura a ordem manual anterior.

---

## 5. Reordenar pelo mapa

- Popup do marcador ganha botões **↑ Subir** / **↓ Descer** (clique reordena imediatamente).
- Sincroniza com a lista de cards e zera `routeGeometry` (precisa reroteirizar).

---

## 6. Histórico de rotas executadas

**Migration:** nova tabela `rotas_executadas`
```
id, carga_id, data_referencia,
km_planejado, km_real, custo_planejado, custo_real,
duracao_planejada_min, duracao_real_min,
ordem_planejada (jsonb), provider, criado_em
```
- INSERT no momento de fechar carga (snapshot do planejado).
- UPDATE quando a movimentação de portaria registra `km_rodado` final.
- Aba nova **"Histórico de rotas"** em `/analytics` com tabela: carga, km plan vs real, % desvio, custo, ranking de desvios.

---

## 7. Arquitetura técnica

### Arquivos editados
- `src/components/dashboard/RotaMap.tsx` — scrollWheelZoom, fullscreen, tile selector, popup com reorder, fitBounds padding.
- `src/components/dashboard/RoteirizacaoDialog.tsx` — combustível, comparação, "Recalcular trajeto", tempo total, horário retorno.
- `src/components/dashboard/FechamentoLoteDialog.tsx` — DnD interno, mostrar custo/tempo, INSERT em `rotas_executadas`.
- `supabase/functions/roteirizar/index.ts` — flag `manterOrdem` para não otimizar; retornar `tempoTotal` agregado.
- `src/pages/Index.tsx` — passar callbacks de reorder.

### Arquivos novos
- `supabase/functions/combustivel-preco/index.ts` — wrapper ANP + cache.
- `src/hooks/useCombustivelPreco.ts`
- `src/hooks/useRotasExecutadas.ts`
- `src/components/analytics/HistoricoRotasTab.tsx`

### Migrations
1. `combustivel_precos` (uf, tipo, valor_litro, atualizado_em) — RLS: select authenticated, insert/update admin/system.
2. `rotas_executadas` — RLS: select admin/logistica/faturamento; insert/update admin/logistica.
3. `app_settings` key `rota_tempo_descarga_min` (default 30).

### Memórias atualizadas
- `mem/tech/geocoding/infrastructure.md` → adicionar nota sobre custo de combustível.
- Novo `mem/features/route-cost-calculation.md`.
- Novo `mem/features/route-history-tracking.md`.

---

## 8. Plano de execução (ordem)

1. Migrations (combustivel_precos, rotas_executadas, app_settings key).
2. Edge function `combustivel-preco` + deploy.
3. Atualizar `roteirizar` (manterOrdem flag, tempo total).
4. `RotaMap` — zoom scroll, fullscreen, tile selector, popup reorder, bug visuais.
5. `RoteirizacaoDialog` — custo, comparação manual×otimizada, recalcular sem reotimizar, tempo+horário retorno.
6. `FechamentoLoteDialog` — DnD, custo/tempo, INSERT `rotas_executadas`.
7. Aba "Histórico de rotas" em Analytics.
8. UPDATE de km real via portaria (já registra km_rodado, basta sincronizar para `rotas_executadas`).

Tudo será validado preview antes de finalizar.