

## Trazer de volta a visão "Lista detalhada" das Rupturas

### O que falta hoje

A aba **Itens** usa `CarregamentoTable`, que **agrupa por carga/cliente** (mesmo layout do Dashboard) — ótimo para operação, mas não é didática para "ler uma a uma" todas as rupturas. As demais abas resumem (Top 5, por carga, por cliente). Não existe mais uma **tabela plana** mostrando cada ruptura como uma linha única e legível, que era o formato anterior.

### Mudança

Adicionar uma nova aba **"Lista detalhada"** em `src/pages/Rupturas.tsx`, definida como **aba padrão** quando o usuário entra na página (no lugar de "Visão geral"). Mantém todas as outras abas e KPIs intactos.

#### Layout da nova aba

Tabela única, uma linha por ruptura, ordenada por data desc:

| Data | Carga | Cliente (cód + nome + UF) | Produto (cód + nome) | Vendedor | Tipo | Peso original | Peso carregado | Kg cortados | Motivo | Status | Ações |
|---|---|---|---|---|---|---|---|---|---|---|---|

- **Tipo**: badge **vermelho "Total"** se `ruptura=true`, **âmbar "Parcial"** se `isRupturaParcial`.
- **Kg cortados**: usa `pesoNaoCarregado(item)`, em destaque âmbar/vermelho.
- **Motivo**: mostra `motivo_ruptura` ou chip cinza "Não informado".
- **Status**: badge com `RUPTURA_STATUS_COLORS`. Se `canChangeStatus`, vira `Select` inline (mesmo `StatusSelect` já usado).
- **Ações**: ícones Editar (lápis) + Excluir (lixeira) — reaproveitam `handleEdit` e `handleDeleteRequest` já existentes.

Subtítulo no topo da aba: "Mostrando N rupturas (X totais + Y parciais) entre [dataInicio] e [dataFim]" — reforça o didatismo.

#### Mobile

Cards verticais (mesmo padrão de `CarregamentoTable.tsx`): cabeçalho com produto + badge Tipo, corpo com cliente/carga/vendedor, rodapé com pesos e botões.

#### Filtros e busca

Reaproveita os filtros do topo da página (período, vendedor, carga, cliente, tipo, busca) — a aba apenas consome o array `rupturas` já filtrado.

#### Export CSV

A função `exportCsv` existente ganha uma branch para `aba === "lista"` exportando exatamente as colunas da tabela.

### Arquivo afetado

- `src/pages/Rupturas.tsx` — adicionar:
  - `<TabsTrigger value="lista">Lista detalhada</TabsTrigger>` (primeira posição).
  - `<TabsContent value="lista">…</TabsContent>` com a tabela/cards descritos.
  - Trocar `defaultValue` da `<Tabs>` para `"lista"`.
  - Branch `lista` na função `exportCsv`.

### Fora do escopo

- Banco, RLS, hooks de dados, demais abas, KPIs, impressão A4 (`RupturasPrintDialog` continua igual).
- `CarregamentoTable` (continua sendo usado na aba **Itens** para quem prefere o agrupamento).

### Resultado

Ao entrar em **/rupturas**, o usuário cai direto na **Lista detalhada** — uma única tabela cronológica com tudo à vista (cliente, produto, kg cortados, motivo, status), exatamente como era a versão anterior. As abas analíticas continuam disponíveis para quem quiser cruzar dados.

