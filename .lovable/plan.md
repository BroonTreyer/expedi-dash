## Problema

Hoje, ao gerar adiantamento na aba **Montar Lote**, todos os CT-es selecionados de uma mesma transportadora viram **um único adiantamento (lote)** — mesmo que sejam de OCs diferentes. Por isso, depois, em "Aguardando Quitação", não dá para quitar/pagar um CT-e separado: ele está amarrado ao lote inteiro.

## Solução

Permitir gerar **um adiantamento por CT-e** (individual), mantendo a opção de agrupar em lote quando o usuário quiser.

### Mudanças na aba "Montar Lote" (`AdiantamentosTab.tsx`)

Em cada card de transportadora (cabeçalho), adicionar um toggle:

```text
[ Agrupar em lote único ]   ⬤ Individual (1 ADT por CT-e)
```

- **Padrão = Individual** (resolve o problema relatado).
- **Estado por transportadora** (`Record<string, 'lote' | 'individual'>`).

### Comportamento ao clicar "Gerar Adiantamento"

No loop `for (const r of resumoPorTransp)`:

- Se modo da transportadora = **`lote`** → comportamento atual (1 chamada `criar.mutateAsync` com todos os CT-es).
- Se modo = **`individual`** → fazer **1 chamada `criar.mutateAsync` por CT-e**, com:
  - `tipo_agrupamento: 'ordem'`
  - `ordem_carga`: a OC do próprio CT-e (ou null)
  - `percentual`: o % configurado para a transportadora
  - `valor_adiantamento_override`: se o usuário digitou valor manual no card, ratear proporcional ao valor do CT-e; caso contrário, null (deixa calcular pelo %)
  - `ctes: [{ id, valor_frete, peso_total }]` (apenas aquele CT-e)

### Resumo lateral (painel direito)

Manter como está, mas mostrar a contagem real de adiantamentos que serão gerados:

```text
Gerar 17 adiantamentos (3 transportadoras)
```

Já existe lógica parecida (`resumoPorTransp.length > 1 ? 'Gerar X adiantamentos'`), só precisa recalcular o total considerando o modo individual (somando `r.ctes.length` quando individual, +1 quando lote).

### Não muda

- Aba "Aguardando Quitação" continua igual — mas agora, como cada CT-e vira 1 ADT, o usuário poderá selecionar/quitar cada CT-e separadamente naturalmente, já que os checkboxes existentes operam por adiantamento.
- Nenhuma mudança em DB, hooks (`useCriarAdiantamento`) ou políticas — só a UI orquestra mais chamadas.

## Arquivos afetados

- `src/components/logistica/AdiantamentosTab.tsx` (único arquivo)
