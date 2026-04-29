## O que vou fazer

### 1) Barra de busca inteligente no Dashboard (/)
Hoje o Dashboard tem um campo "Buscar..." simples que filtra por texto livre, mas você precisa **acumular** vários termos (ex.: filtrar por código de cliente E vendedor E placa, sem perder o anterior).

Vou substituir esse campo por uma **busca com tags acumulativas**:

- Campo único de busca que sugere resultados conforme você digita, varrendo simultaneamente: **código do cliente, nome do cliente, vendedor, número do pedido, placa, motorista, transportadora, cidade, UF, nome da carga e produto**.
- Cada sugestão mostra o tipo (ex.: "Cliente · 12345 — Padaria X", "Vendedor · João", "Pedido #4567", "Placa ABC1D23").
- Ao clicar/Enter na sugestão, ela vira uma **tag** abaixo da barra e o campo limpa, pronto pra próxima busca.
- Tags se acumulam (lógica AND entre tipos diferentes, OR dentro do mesmo tipo — ex.: 2 vendedores selecionados = "qualquer um dos dois", mas combinados com cliente = "esses vendedores E esse cliente").
- Cada tag tem um "X" pra remover individualmente; botão "Limpar tudo" remove todas.
- As tags ficam integradas ao estado de filtros (`filters.busca` vira `filters.searchTags: SearchTag[]`), então convivem com os outros filtros (período, UF etc.) e contam no badge "Limpar filtros".

Texto livre que não casar com nenhuma sugestão continua funcionando: vira uma tag "Texto: ..." que faz busca textual ampla (igual ao comportamento atual).

### 2) Correção da tag de Ruptura que não some

**Causa raiz (confirmada no banco):** existem dois gatilhos no Postgres que **acendem** a flag `ruptura_sinalizada` quando o item entra em ruptura (total ou parcial), mas **nenhum** apaga essa flag quando você desmarca a ruptura ou restaura o peso original. A tabela tem duas colunas:
- `ruptura` (boolean) — ruptura total marcada no momento.
- `ruptura_sinalizada` (boolean) — "já teve ruptura em algum momento", grudada pelo trigger.

A função `temRuptura()` mostra a tag se **qualquer uma** das duas for `true`. Por isso, mesmo após desmarcar `ruptura`, a tag persiste.

Além disso, os fluxos de edição (`useEditarPedidoAprovacao.ts`, `MeusPedidos.tsx`, edição de carga) atualizam `ruptura` mas **nunca tocam** em `ruptura_sinalizada`.

**Correção em duas camadas:**

a) **Trigger no banco** — alterar `set_ruptura_sinalizada` e `preserve_peso_original` para também **desligar** `ruptura_sinalizada` quando:
   - `ruptura = false` E
   - `peso >= peso_original` (ou seja, não há ruptura parcial)
   
   Assim a flag passa a refletir o estado real, não fica grudada.

b) **Frontend** — nos updates de edição de pedido (`useEditarPedidoAprovacao`, `MeusPedidos`, `EditarCargaDialog`) passar explicitamente `ruptura_sinalizada: false` quando `ruptura` for desmarcada e o peso voltou ao original. Isso é defensivo: se o trigger falhar, o estado correto é gravado direto.

c) **Backfill** — uma migration única que normaliza os registros existentes: `UPDATE carregamentos_dia SET ruptura_sinalizada = false WHERE ruptura = false AND (peso_original IS NULL OR peso >= peso_original)`. Limpa as tags fantasmas que já estão no banco.

## Detalhes técnicos

**Arquivos a editar:**
- `src/components/dashboard/Filters.tsx` — substituir o `<Input>` de busca por um novo `SmartSearchBar` com Popover + Command (já existe `cmdk` no projeto). Trocar `filters.busca: string` por `filters.searchTags: SearchTag[]`.
- `src/components/dashboard/SmartSearchBar.tsx` (**novo**) — componente reutilizável com tipos: `cliente | vendedor | placa | motorista | transportadora | cidade | uf | pedido | carga | produto | texto`.
- `src/pages/Index.tsx` — atualizar a lógica de filtragem para consumir `searchTags` (substitui o filtro `busca` atual). Cada tag aplica um predicado específico; texto livre faz `includes` em vários campos como hoje.
- `src/lib/ruptura-utils.ts` — sem mudança lógica (continua refletindo o que o banco diz; a correção real é no banco).
- `src/hooks/useEditarPedidoAprovacao.ts`, `src/components/vendedor/MeusPedidos.tsx`, `src/components/dashboard/EditarCargaDialog.tsx` — passar `ruptura_sinalizada: false` quando aplicável nos UPDATEs.

**Migrations (banco):**
- Atualizar a função do trigger `set_ruptura_sinalizada` (e/ou `preserve_peso_original`) para apagar a flag quando o estado voltou a "sem ruptura".
- Backfill: `UPDATE` único limpando registros já bagunçados.

**Persistência da busca:** `searchTags` fica em estado local do Dashboard (mesmo padrão dos outros filtros — não persiste entre sessões), mas é considerada no contador "Limpar filtros".

**Performance:** as sugestões são calculadas a partir dos arrays já carregados (`carregamentos`, `vendedores`, `clientes`) com `useMemo` + filtro por substring; sem query nova ao banco.
