## Aba "Pré-cargas"

Nova rota dedicada `/pre-cargas` no menu lateral, focada em quem precisa cuidar das pré-cargas (admin, logística, faturamento). Reaproveita a mesma fonte de dados (`useCarregamentos`) e o dialog de edição já existente.

### 1. Nova rota e item no menu

- **`src/pages/PreCargas.tsx`** (novo): página completa.
- **`src/App.tsx`**: registrar a rota `/pre-cargas` com `ProtectedRoute allowedRoles={["admin","logistica","faturamento"]}` (lazy import como as demais).
- **`src/components/AppSidebar.tsx`**: novo item "Pré-cargas" (ícone `Package` ou `PackageOpen`), visível para admin/logística/faturamento. Pode aparecer perto de "Consolidado".

### 2. Layout da página

```text
┌─────────────────────────────────────────────────────┐
│ Pré-cargas                       [busca][filtro UF] │
├─────────────────────────────────────────────────────┤
│ ▸ Carga ABC123 · 9.477 kg total · 5 pedidos · GO    │
│   Placa ABC1D23 · Motorista João · Bitruck          │
│   ⚠ 2 itens em ruptura (50 kg)                      │
│   [Editar pedido] [Finalizar carga] [Cancelar]      │
│                                                     │
│   ▾ Expandido: tabela com 5 pedidos                 │
│     Pedido · Cliente · Cidade · Peso · Ruptura  ⋯  │
│     Linhas com ruptura destacadas em vermelho       │
│     Botão "Editar" por pedido → abre o dialog       │
└─────────────────────────────────────────────────────┘
```

- Cards/accordion por `carga_id`. Header com KPIs: peso total, peso embarcado (efetivo), peso em ruptura, qtd pedidos, destinos.
- Conteúdo expandido: tabela dos itens (`carregamentos_dia` com `etapa = 'pre_carga'`), agrupando por `numero_pedido`. Linhas/itens em ruptura ficam destacados (`bg-destructive/5`, ícone `AlertTriangle`).
- KPI cards no topo da página: total de pré-cargas, total de pedidos, total kg, total kg em ruptura.

### 3. Visão de "o que falta" (rupturas)

Para cada pré-carga, calcular:
- `itensRuptura = items.filter(temRuptura)` (já existe util em `src/lib/ruptura-utils.ts`).
- `pesoRuptura = soma(pesoNaoCarregado)` (já existe em `src/lib/peso-utils.ts`).
- Mostrar um badge vermelho `⚠ N item(s) em ruptura · X kg faltando`.
- Linha colapsável "Itens em ruptura" listando produto · qtd · motivo.

(Sem incluir, por enquanto, sugestão de pedidos de fora ou checagem de campos de transporte — escopo combinado.)

### 4. Edição de pedido (faturamento)

- Botão **"Editar pedido"** por linha agrupada → abre o `EditarPedidoAprovacaoDialog` já existente (`src/components/aprovacoes/EditarPedidoAprovacaoDialog.tsx`), passando o pedido atual.
- Salvar usa o hook `useEditarPedidoAprovacao` que já cuida de update/insert/delete dos itens, audit log e invalidação.
- **Sem flag `aprovarAposSalvar`** — o pedido continua dentro da pré-carga (etapa permanece `pre_carga`). Vou ajustar o uso para não forçar `etapa: vendas` ao salvar:
  - Hoje, quando `aprovarAposSalvar` é falso, o hook mantém a etapa atual nos UPDATE (não faz `set etapa`). Confirmado — basta chamar com `aprovarAposSalvar: false`.
  - Para INSERT (item novo dentro de uma pré-carga existente): o hook força `etapa: 'aguardando_faturamento'`. Vou estender o hook (parâmetro opcional `novaEtapa`) para permitir `etapa: 'pre_carga'` + propagar `carga_id`, `nome_carga`, `placa`, `motorista`, `transportadora`, `tipo_caminhao`, `ordem_carga`. Assim, novos itens nascem dentro da mesma pré-carga.

### 5. Permissões

- Rota protegida para `admin | logistica | faturamento`.
- RLS já cobre: `Ops update/insert/delete carregamentos_dia` aceita os três papéis.
- Botão "Editar pedido" visível para os três (faturamento foi o foco do pedido, mas log/admin também).

### 6. Reaproveitamentos

- `useCarregamentos` (mesmo hook do Index) — sem nova query.
- `PreCargasPanel` atual no Index continua funcionando; a nova página é independente e mais rica.
- Utils: `temRuptura`, `pesoEfetivo`, `pesoNaoCarregado`, `quantidadeNaoCarregada`.
- `EtapaBadge`, `StatusBadge`, `Badge`, `Accordion`, `Table` do design system.

### Detalhes técnicos

- **Arquivos novos:** `src/pages/PreCargas.tsx`, `src/components/precargas/PreCargaCard.tsx`, `src/components/precargas/PreCargaItensTable.tsx`.
- **Arquivos editados:** `src/App.tsx` (nova rota), `src/components/AppSidebar.tsx` (novo item de menu), `src/hooks/useEditarPedidoAprovacao.ts` (parâmetro opcional para preservar etapa pré-carga ao inserir novo item).
- **Sem migrations** — schema atual já suporta tudo (`etapa = 'pre_carga'`, `carga_id`, `ruptura`, `ruptura_sinalizada`).
- **Sem mudança no `PreCargasPanel`** atual — mantemos compatibilidade.
- Datas/números em pt-BR (`toLocaleString("pt-BR")`), conforme padrão do projeto.

### Fora de escopo (para confirmar depois)

- Sugestão de pedidos "soltos" do mesmo cliente/rota para entrar na pré-carga.
- Sinalização de campos de transporte vazios (placa/motorista/transportadora).
- Adicionar novo pedido inteiro (não apenas item) à pré-carga existente.
