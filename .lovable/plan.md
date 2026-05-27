## Problema

No card de pré-carga (pedido #173, RS Distribuidora), o badge mostra **"12.000 kg"** de ruptura e o chip do produto 720 mostra **"6.000 kg"**, mesmo depois de o vendedor ter editado o pedido em Aprovações reduzindo o item para **peso=700 / qtd=70** (mantendo o toggle "Ruptura" ligado).

## Causa raiz

No banco o item 720 está hoje assim:

| peso | peso_original | qtd | qtd_original | ruptura |
|------|---------------|-----|--------------|---------|
| 700  | **6000**      | 70  | **300**      | true    |

A função `pesoNaoCarregado` (em `src/lib/peso-utils.ts`) para itens com `ruptura=true` retorna `peso_original` — porque uma ruptura "total" significa "perdi o que foi pedido". Como `peso_original` ficou em 6000, o card continua exibindo 6.000 kg.

O `peso_original` não foi rebaseado porque em `src/hooks/useEditarPedidoAprovacao.ts` há uma regra explícita:

```ts
const rebaseBaseline = !it.ruptura;  // só rebase se NÃO for ruptura
```

Quando o item está em ruptura, o hook preserva o `peso_original` antigo "para a aba Rupturas continuar mostrando o pedido original". Isso entra em conflito com o caso em que o próprio vendedor está, em Aprovações, redefinindo a demanda do item — que é exatamente o que aconteceu aqui.

## Plano

**1. Corrigir o registro atual no banco** (RS Distribuidora · pedido 173)

Rebasear baseline dos dois itens em ruptura desse pedido para refletir o que o vendedor já gravou na edição:

- Item 720 MORTADELA: `peso_original = 700`, `quantidade_original = 70`
- Item 600 LING SUINA: `peso_original = peso` atual, `quantidade_original = quantidade` atual

Isso faz o chip cair imediatamente para "700 kg" (e o total do pedido para 700 + 6.000 = 6.700 kg, se o 600 continuar 6.000).

**2. Ajustar o hook para o problema não voltar**

Em `src/hooks/useEditarPedidoAprovacao.ts`, no bloco de UPDATE, passar a rebasear `peso_original`/`quantidade_original` **sempre** (inclusive quando `ruptura=true`). Justificativa: Aprovações é a etapa em que o vendedor redefine a demanda do pedido; se ele baixou o peso, a nova referência É a demanda real. A aba Rupturas continua correta porque a perda de uma ruptura total passa a ser igual ao novo `peso_original` (= o que o vendedor confirmou como pedido).

Remover o comentário antigo que dizia o oposto e deixar uma linha curta explicando o novo comportamento.

**3. Não mexer em mais nada**

- Sem mudança em triggers do banco (`cap_peso_pelo_original` continua válido — o rebase acontece no mesmo UPDATE, então `peso ≤ peso_original` segue verdadeiro).
- Sem mudança no `CarregamentoDialog` (lá já existem botões "Restaurar original" / "Confirmar redução" que tratam o caso oposto, no chão de carregamento).
- Sem mudança em `useCarregamentos`, `usePreCargas` ou nos componentes de exibição.

## Detalhes técnicos

Arquivos afetados:

- **Banco** (via `supabase--insert` com UPDATE): `carregamentos_dia` ids `1b05d182-…` e `8e6487a0-…`.
- **Código**: `src/hooks/useEditarPedidoAprovacao.ts` — remover a condicional `rebaseBaseline = !it.ruptura` e sempre incluir `peso_original: it.peso, quantidade_original: it.quantidade` no payload do UPDATE.

Riscos: nenhum no fluxo de carregamento (o `CarregamentoDialog` opera sobre `peso_original` definido em Aprovações, que continua sendo a referência atualizada). A aba Rupturas passará a refletir o pedido vigente, não o pedido pré-edição — comportamento desejado nesse cenário.