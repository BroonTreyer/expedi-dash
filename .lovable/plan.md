

## Rupturas Parciais — rastrear o que deixou de carregar

### Problema

Hoje, quando um pedido tem 5000kg e na hora de fechar a carga o operador reduz para 2000kg porque faltou produto, os 3000kg "somem". O sistema só sabe se um item está em ruptura total (`ruptura = true`), mas não consegue dizer **quanto** deixou de carregar nem **por que** (estoque, qualidade, etc.).

Para preservar a memória da venda original e medir o impacto, precisamos guardar o peso/quantidade originalmente pedidos e marcar a diferença como ruptura parcial.

### Conceito

Toda linha de `carregamentos_dia` passa a ter dois "lados":

- **Planejado (original)** — o que o vendedor pediu. Não muda quando logística edita.
- **Efetivo (real)** — o que de fato foi carregado. É o `peso`/`quantidade` atual.

Se houver diferença, a linha é uma **ruptura parcial** automaticamente.

```text
Pedido original:    5000 kg
Carregado:          2000 kg   ← peso atual
Ruptura parcial:    3000 kg   ← peso_original - peso  (calculado)
```

Ruptura total continua sendo `ruptura = true` com peso efetivo = 0 (já existe).

### Mudanças no banco (migration)

Adicionar em `carregamentos_dia`:

| Coluna | Tipo | Default | Para quê |
|---|---|---|---|
| `peso_original` | numeric | NULL | Peso pedido originalmente |
| `quantidade_original` | numeric | NULL | Qtd pedida originalmente |
| `motivo_ruptura` | text | NULL | "estoque", "qualidade", "logística", "outro" |

Trigger `BEFORE INSERT`:
- Se `peso_original` for NULL, copia `peso` (toda venda nasce com original = atual).

Trigger `BEFORE UPDATE`:
- Se `peso` mudar e o usuário não enviou `peso_original` explícito, mantém o `peso_original` antigo (não sobrescreve). Isso garante que reduzir o peso preserve o original.
- Se `peso` < `peso_original` e `ruptura_parcial_kg > 0`, marca `ruptura_sinalizada = true` (já existe a flag).

Backfill: para linhas antigas, `UPDATE carregamentos_dia SET peso_original = peso WHERE peso_original IS NULL`.

### Mudanças no frontend

**1. Diálogo de edição da carga (`EditarCargaDialog` / fluxo de fechamento)**
- Quando o operador reduz o peso de um item, mostrar abaixo do input:
  - "Pedido original: 5000 kg → Ruptura parcial: 3000 kg"
- Campo opcional **Motivo da ruptura parcial** (select: Estoque / Qualidade / Logística / Outro).
- Ao salvar, NÃO enviar `peso_original` (trigger preserva). Enviar `peso`, `quantidade` e `motivo_ruptura`.

**2. Página Rupturas (`src/pages/Rupturas.tsx`)**
- Filtrar inclui linhas com `ruptura = true` **OU** `peso < peso_original` (ruptura parcial).
- Nova coluna **Tipo**: badge "Total" (vermelha) ou "Parcial — 3000 kg" (âmbar).
- KPIs separados:
  - Rupturas Totais (qtde + peso planejado perdido)
  - Rupturas Parciais (qtde + diferença em kg)
  - Peso Total Não Carregado = soma de (peso_original − peso_efetivo)
- Resumo por produto soma a diferença das parciais junto com o peso das totais.
- Detalhamento mostra `Pedido original | Carregado | Diferença | Motivo`.
- Atualizar `RupturasPrintDialog` com as mesmas colunas.

**3. Analytics (`src/pages/Analytics.tsx` + `useAnalytics.ts`)**
- Buscar também `peso_original` e `motivo_ruptura`.
- Novos atalhos de período: **Hoje** e **Ontem** (somar a `PERIOD_OPTIONS`).
- Nova aba/seção **Rupturas** ganha:
  - KPI "Peso Não Carregado" = Σ(peso_original − peso) para linhas com ruptura total ou parcial, no período.
  - KPI "Rupturas Parciais" (qtde de linhas com `peso < peso_original` e `ruptura = false`).
  - Gráfico diário com 2 séries: Peso Planejado vs Peso Efetivo.
  - Top produtos por peso não carregado (somando totais + parciais).
  - Breakdown por motivo (`motivo_ruptura`).

### Tipos / hooks

- `Carregamento` (em `useCarregamentos`) ganha `peso_original`, `quantidade_original`, `motivo_ruptura`.
- Helper em `src/lib/peso-utils.ts`:
  ```ts
  pesoNaoCarregado(c) = c.ruptura ? (c.peso_original ?? c.peso ?? 0)
                                  : Math.max(0, (c.peso_original ?? c.peso ?? 0) - (c.peso ?? 0));
  isRupturaParcial(c) = !c.ruptura && (c.peso_original ?? 0) > (c.peso ?? 0);
  ```

### O que NÃO muda

- `ruptura = true` continua significando ruptura total (item não foi carregado).
- Pedidos novos nascem com `peso_original = peso`, então não há ruptura parcial até alguém editar para menos.
- Vendas (etapa `vendas`) continuam editando peso livremente — só depois de fechar a carga é que reduzir o peso vira ruptura parcial; por isso o aviso visual aparece no diálogo de fechamento/edição da carga, não no cadastro de venda.
- Sem alteração de RLS, sem alteração de auth.

### Arquivos afetados

- Migration nova: adicionar colunas + triggers + backfill
- `src/lib/peso-utils.ts` — helpers novos
- `src/integrations/supabase/types.ts` — auto
- `src/hooks/useCarregamentos.ts` — passar pelas novas colunas
- `src/components/dashboard/EditarCargaDialog.tsx` (e diálogo de fechamento de carga, se separado) — UI de aviso + motivo
- `src/pages/Rupturas.tsx` — filtros, KPIs, tabela, resumo
- `src/components/dashboard/RupturasPrintDialog.tsx` — colunas
- `src/hooks/useAnalytics.ts` — novas métricas
- `src/pages/Analytics.tsx` — Hoje/Ontem + KPIs e gráfico de ruptura

### Resultado

- Reduzir o peso de um item em uma carga fechada deixa rastro: aparece em Rupturas como "Parcial — 3000 kg" com motivo.
- Apagar pedido para "limpar" deixa de ser necessário — basta reduzir o peso.
- Analytics passa a mostrar quanto a operação deixa de embarcar por dia, com filtros Hoje/Ontem.

