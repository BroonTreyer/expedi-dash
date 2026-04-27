## Melhorias no NovoPedidoDialog (vendedor)

Dois ajustes no formulário de pedido do vendedor:

### 1. Campo de produto com busca (digitar código OU nome)

Substituir o `Select` atual de produto por um **Combobox com busca** (padrão `Command` do shadcn, igual ao usado no `CarregamentoDialog`):

- Input de busca livre que filtra a lista por **código** ou **nome** do produto enquanto digita.
- Resultado em dropdown mostrando `código – nome`.
- Ao selecionar, preenche código + nome + peso padrão como hoje.
- Mantém a lista limitada aos produtos `ativo = true`.

### 2. Peso ↔ Quantidade bidirecional

Hoje a relação só funciona num sentido (qtd → peso). Vou tornar bidirecional, igual ao padrão da memória `data-automation`:

- **Mudou Quantidade** → recalcula `peso = pesoPadrao × qtd` (como já é hoje).
- **Mudou Peso** → recalcula `quantidade = round(peso / pesoPadrao)` quando há `pesoPadrao > 0`.
- Marca `peso_manual = true` apenas quando o usuário digita um peso que NÃO bate com `pesoPadrao × qtd` (preserva a regra de não sobrescrever depois).
- Para produtos sem peso padrão (ex.: Pão de Alho – por unidade) ou sem produto ainda selecionado, peso e qtd ficam independentes.

### Arquivos afetados

- `src/components/vendedor/NovoPedidoDialog.tsx` — substituir Select por Combobox + atualizar `handlePesoChange` para recalcular qtd.

Sem mudanças de banco. Sem impacto em outros fluxos.