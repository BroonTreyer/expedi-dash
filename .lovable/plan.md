

## Página Rupturas v2 — Inteligente, completa e acionável

### O que muda

Reescrita completa da página `src/pages/Rupturas.tsx`. Mantém os mesmos hooks e mutations (sem mudança de banco), mas reorganiza a leitura em **5 blocos com narrativa clara** + tabs para focar no que importa: o que faltou, quem foi prejudicado, qual carga foi cortada, e o que mudou no pedido (auditoria).

### Layout da nova tela

```text
┌─────────────────────────────────────────────────────────────┐
│ Header: título + período + ações (Imprimir, Exportar, Novo) │
├─────────────────────────────────────────────────────────────┤
│ Filtros: Período | Vendedor | Carga | Cliente | Status |   │
│          Tipo (Total/Parcial/Ambas) | Busca                 │
├─────────────────────────────────────────────────────────────┤
│ KPIs (6 cards):                                             │
│  • Itens em ruptura (totais + parciais)                     │
│  • Peso não carregado (kg / TON)                            │
│  • Cargas afetadas (nº)                                     │
│  • Clientes prejudicados (nº)                               │
│  • Pedidos editados (com peso reduzido na hora do fech.)    │
│  • Maior corte do período (produto + kg)                    │
├─────────────────────────────────────────────────────────────┤
│ Tabs:  [Visão geral] [Por produto] [Por cliente]            │
│        [Por carga] [Linha do tempo] [Itens]                 │
└─────────────────────────────────────────────────────────────┘
```

### Conteúdo de cada aba

**1. Visão geral** — 3 widgets lado a lado:
- **Top 5 produtos cortados** (barras horizontais com kg perdido).
- **Top 5 clientes prejudicados** (cliente + nº cargas + kg que deixou de chegar).
- **Top motivos de ruptura** (`motivo_ruptura` agrupado, com count e % do total — "Não informado" destacado em vermelho para sinalizar lacuna de cadastro).

**2. Por produto** — tabela existente, melhorada:
- Colunas: Código, Produto, Total / Parcial (split), Qtd pedidos, Peso original, Peso carregado, **Kg cortados**, **Cargas afetadas** (chips), **Clientes afetados** (count + tooltip).
- Ordenação por kg cortados (desc).

**3. Por cliente** *(nova)*:
- Colunas: Código, Cliente, UF, Pedidos afetados, Produtos faltantes (chips), Kg não entregues, Cargas (chips clicáveis que filtram).
- Permite ver imediatamente quem ficou sem mercadoria.

**4. Por carga** — versão melhorada de "Cargas Fechadas com Pendência":
- Colunas: Carga, Data fechamento, Veículo (placa + motorista), Itens cortados (count), Kg cortados, % de corte sobre o peso planejado, Status dos itens (chips), Botão "Ver detalhes" que filtra a aba **Itens**.
- Destaque em vermelho cargas com >10% de corte.

**5. Linha do tempo de edições** *(nova — ouro do usuário)*:
- Lista cronológica reversa lendo `audit_log` (entity_type=`carregamento`) filtrando ações que mudaram `peso`, `ruptura`, ou `motivo_ruptura` dos itens das rupturas do período.
- Cada linha: timestamp · usuário · pedido/produto · "peso 500 kg → 300 kg (corte de 200 kg)" · motivo se houver.
- Permite responder "quem cortou, quando, quanto".
- Limite: 200 linhas mais recentes; busca/scroll.

**6. Itens** — `CarregamentoTable` atual (igual ao que existe hoje), para ações operacionais (editar status, completar, excluir). Mantém deep-link `?carga=`.

### Componentes auxiliares (sem novos arquivos pesados)

Tudo dentro de `src/pages/Rupturas.tsx` em sub-componentes locais:
- `KpiGrid` — 6 cards com ícone + número + sublabel.
- `TopBars` — barras horizontais simples (div com width %, sem libs novas).
- `TabPorCliente`, `TabPorCarga`, `TabLinhaDoTempo`, `TabPorProduto`, `TabVisaoGeral`.

Reusa: `Tabs/TabsList/TabsTrigger/TabsContent` (já existem), `Card`, `Badge`, `Table`, `Tooltip`, `Popover`+`Calendar` (date range), `MultiSelectFilter` (já usado no Dashboard) para vendedor/carga/cliente.

### Hooks/dados

- `useCarregamentos(dateFrom, dateTo)` — já existe, traz `peso`, `peso_original`, `motivo_ruptura`, `ruptura`, `ruptura_sinalizada`, `vendedores`.
- `useClientes()` — já usado, para enriquecer UF.
- **Novo hook leve `useAuditLogRupturas(itemIds: string[])`** em `src/hooks/useAuditLog.ts`: faz `select * from audit_log where entity_type='carregamento' and entity_id in (...) order by created_at desc limit 200`. Filtra no front por `changes` que contenham `peso`, `ruptura`, `peso_manual` ou `motivo_ruptura`. `enabled: itemIds.length > 0`.
- Cálculo de "peso planejado vs cortado" por carga: soma `peso_original` de **todos** os itens com mesmo `carga_id` (não só rupturas) ÷ soma `peso` para o %. Já vem no array de `carregamentos`.

### Detalhes finos

- **Filtro de tipo** (novo): segmented control com `Ambas | Total | Parcial`.
- **Export CSV**: botão extra ao lado de Imprimir → exporta a aba ativa (produto/cliente/carga/itens) como `.csv` UTF-8 com BOM.
- **Estado vazio**: ilustração simples + frase "Sem rupturas no período selecionado 🎯".
- **Mobile**: Tabs viram scroll horizontal; tabelas viram cards (mesmo padrão de `CarregamentoTable`).
- **Cores**: âmbar para parcial, vermelho para total e cortes >10%, neutro nas demais.
- **Deep-link `?carga=`**: continua funcionando, abre direto na aba **Itens** com filtro aplicado.

### Arquivos afetados

- `src/pages/Rupturas.tsx` — reescrita completa (~600 → ~750 linhas, organizado em sub-componentes locais).
- `src/hooks/useAuditLog.ts` — adiciona `useAuditLogRupturas(itemIds)`.

### Fora do escopo (não muda)

- Banco de dados, RLS, triggers.
- `RupturasPrintDialog`, `CarregamentoDialog`, `DeleteConfirmDialog`, `CarregamentoTable`.
- Lógica de `pesoNaoCarregado` / `isRupturaParcial` em `peso-utils.ts`.

### Resultado

A página passa a responder, em uma olhada: **quanto** foi cortado, **de quê**, **para quem**, **em qual carga**, **por quem** e **por qual motivo** — com 6 KPIs no topo, 5 abas de leitura e 1 aba operacional. Sem mudar nada do que já funciona no fluxo de edição/impressão.

