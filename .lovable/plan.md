## Tabelas de frete vinculadas a vendedores (com cliente opcional)

Hoje a tarifa é resolvida por `destino_cidade + destino_uf + tipo_veiculo`, igual para todo mundo. Vamos transformar em **tabelas nomeadas**, cada uma com várias linhas (cliente opcional + destino + UF + valores), vinculadas a um ou mais vendedores. Conflitos de valor entre tabelas do mesmo vendedor para o mesmo cliente/destino serão sinalizados — nada de "escolher silenciosamente".

---

### 1. Banco (migração)

Três tabelas novas + migração das tarifas atuais:

**`tabelas_frete`** — cabeçalho (a "tabela" em si)
- `id uuid pk`
- `nome text not null` (ex.: "Padrão", "Norte/NE Premium", "Cliente XPTO")
- `descricao text`
- `ativo boolean default true`
- `created_at`, `updated_at`

**`tabelas_frete_itens`** — linhas (substitui a `tabela_frete` atual)
- `id uuid pk`
- `tabela_id uuid → tabelas_frete(id) on delete cascade`
- `codigo_cliente text null` ← **null = genérica para qualquer cliente naquele destino/UF**
- `destino_cidade text not null`
- `destino_uf text not null` (2 letras, upper)
- `valor_kg_bitruck numeric default 0`
- `valor_kg_carreta numeric default 0`
- `ativo boolean default true`
- UNIQUE `(tabela_id, coalesce(codigo_cliente,''), lower(destino_cidade), upper(destino_uf))`
- Índices em `(tabela_id)`, `(codigo_cliente)`, `(lower(destino_cidade), upper(destino_uf))`

**`vendedor_tabelas_frete`** — N:N vendedor ↔ tabela
- `vendedor_id uuid → vendedores(id) on delete cascade`
- `tabela_id uuid → tabelas_frete(id) on delete cascade`
- `created_at`
- PK composta `(vendedor_id, tabela_id)`

**RLS**: mesmas regras da `tabela_frete` atual (admin/logistica).

**Migração de dados**: criar tabela "Padrão" e inserir todas as linhas atuais agregando bitruck+carreta da mesma cidade/UF numa única linha (cliente vazio). **Sem vincular a nenhum vendedor** (o admin vincula manualmente). A tabela antiga `tabela_frete` é mantida por enquanto e dropada num passo seguinte (depois de o usuário confirmar que migrou tudo).

---

### 2. Lógica de resolução de tarifa (vendedor + cliente + destino)

Para cada item de pedido com `vendedor_id`, `codigo_cliente`, `cidade`, `uf`:

1. Busca todas as tabelas ativas vinculadas ao vendedor.
2. Em cada uma, procura linha do destino (cidade+UF), preferindo `codigo_cliente = X` sobre `codigo_cliente IS NULL`.
3. Junta os valores encontrados (uma entrada por tabela que respondeu).
4. **Conflito** = duas ou mais tabelas retornam valores diferentes (>0,01 R$/kg) para o mesmo (cliente, destino, tipo_veiculo). Nesses casos:
   - tarifa fica como `null` no cálculo
   - destino é marcado com `conflito: true` + lista de tabelas/valores divergentes
   - UI mostra alerta destacado
5. Sem conflito → usa o valor consensual.
6. Sem nenhuma tabela respondendo → `sem_tarifa: true` (igual hoje).

---

### 3. UI — `TabelaFreteTab` reescrita

Vira uma tela com 3 áreas:

```text
┌─────────────────────────────────────────────────────────┐
│ [Tabelas]                              [+ Nova tabela]  │
│ ─ Padrão (314 destinos · 12 vendedores) ────────────►  │
│ ─ Norte/NE Premium (40 · 3 vend.)                       │
│ ─ Cliente XPTO (5 · 1 vend.)                            │
└─────────────────────────────────────────────────────────┘
   ↓ ao selecionar uma tabela:

┌─ Tabela: Padrão ────────────────────────────────────────┐
│ Vendedores vinculados: [chips] [+ vincular]             │
│ ┌─ Buscar...   [+ Adicionar linha]                      │
│ │ Cliente (cód) │ Destino   │ UF │ Bitruck │ Carreta │ ✕│
│ │ (qualquer)    │ Goiânia   │ GO │  0,28   │  0,25   │  │
│ │ 12345 ACME    │ Goiânia   │ GO │  0,22   │  0,20   │  │
│ └──────────────────────────────────────────────────────  │
└─────────────────────────────────────────────────────────┘
```

- Campo **Cliente** com autocomplete em `clientes` (digita código ou nome). Vazio = "qualquer cliente".
- Vincular vendedores: popover com lista pesquisável de `vendedores`, multi-select.
- Mantém colunas separadas bitruck/carreta por linha (decisão do usuário).

---

### 4. `useGastosVendedor` ajustado

- Tira o `tabela_frete` global. Carrega:
  - `vendedor_tabelas_frete` + `tabelas_frete_itens` das tabelas vinculadas a qualquer vendedor presente nos pedidos do período.
- Indexa por `vendedor_id → tabelaId[] → itens`.
- Substitui o cálculo atual (loop por destino) por um loop **por (carga, destino, vendedor)**:
  - resolve tarifa via lógica acima
  - acumula `previsto_vend` somando `peso_vend * valor_kg`
  - se conflito ou sem tarifa, peso continua entrando, mas `previsto` desse trecho fica null + flag
- Novos campos por destino: `conflito: boolean`, `tabelas_divergentes: Array<{nome, valor_kg_bitruck, valor_kg_carreta}>`.
- KPI da carga ganha contagem de "destinos em conflito" ao lado de "destinos sem tarifa".

---

### 5. UI — `GastosVendedorTab`

- Mantém tudo que existe (badges CIF/não classificadas, divergência CT-e, etc.).
- Adiciona banner por linha de carga quando `destinos_em_conflito > 0`: "X destino(s) com tarifas conflitantes — revise as tabelas vinculadas".
- No detalhe (drawer/expandido), cada destino com conflito mostra a lista das tabelas divergentes e seus valores.

---

### Detalhes técnicos

- **Hook novo**: `useTabelasFrete()` → CRUD de cabeçalho, itens e vínculos (substitui `useTabelaFrete`).
- A tabela legada `tabela_frete` continua existindo após a migração; o código deixa de lê-la. Removemos no PR seguinte para garantir rollback simples.
- Resolver tarifa client-side (já temos os mapas em memória) — não precisa de RPC.
- Conflito é tolerância de 0,01 R$/kg para evitar ruído de centavos.
- Tipo `DestinoDetalhe` ganha `conflito` e `tabelas_divergentes`.

---

### Resultado

- Cada vendedor pode ter 1+ tabelas; cada tabela serve 1+ vendedores.
- Linhas podem ser específicas de cliente ou genéricas por destino.
- Quando duas tabelas vinculadas ao mesmo vendedor discordam → sistema avisa e não chuta valor.
- Tarifas atuais ficam preservadas numa tabela "Padrão" pronta para o admin vincular onde fizer sentido.
