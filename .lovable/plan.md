## Diagnóstico

O cálculo da tela está honesto, mas os **dados estão inflando** o total. Identifiquei dois problemas distintos:

### Problema 1 — `peso_original` replicado entre itens do mesmo pedido (CRÍTICO)

O **Pedido 48 (J SANTOS SILVA GANDU)** tem 8 itens, e **todos** estão com `peso_original = 7.000 kg`. Isso é claramente o peso total do pedido sendo replicado em cada linha, em vez do peso individual de cada produto.

Resultado: o sistema soma 8 × 7.000 = **56 toneladas falsas** só desse pedido. Os pedidos 13 e 83 têm o mesmo sintoma (em escala menor).

Hoje, dos ~49 toneladas mostrados em "Faltando" no dia 29/04, **cerca de 47 toneladas vêm desse bug**. O número real está mais perto de **~2 toneladas**.

A causa provável é alguma rotina (cadastro de pedido, importação de PDF, ou clonagem) que copia o peso total da nota para o campo `peso_original` de cada item, em vez do peso da linha.

### Problema 2 — Ruptura total marcada sem zerar o peso

O **Pedido 96 (JR DISTRIBUIDORA)** tem 5 itens marcados como `ruptura = true`, mas com `peso = peso_original` (não foi zerado). O `pesoNaoCarregado` assume que ruptura total = perda do peso original inteiro, somando ~4,5 toneladas que talvez nem sejam ruptura real.

## Plano

### 1. Corrigir os dados existentes (migração one-shot)
- Identificar pedidos onde todos os itens têm o mesmo `peso_original` E esse valor é muito maior que o `peso` somado dos itens (indicando replicação do total).
- Para esses pedidos, **redefinir `peso_original = peso`** quando não houver evidência de redução real (item nunca foi alterado ou `peso_manual = false` desde a criação).
- Pedidos suspeitos no período: 48, 13, 83 (29/04). Ampliar a busca para os últimos 30 dias.

### 2. Prevenir a replicação no futuro
- Auditar onde `peso_original` é gravado:
  - Trigger `preserve_peso_original` (já existe e parece correta — usa `NEW.peso` na criação).
  - Edge function `parse-pedido-pdf` — provável culpada de replicar o peso total.
  - Lógica de clonagem de pedidos.
- Garantir que `peso_original` recebe sempre o peso da **linha individual**, nunca o total do pedido.

### 3. Tratar ruptura total sem peso zerado (Rupturas.tsx)
- Mudar a regra de `pesoNaoCarregado` para ruptura total: usar `peso_original - peso` (a perda real), em vez de assumir o original inteiro.
- Justificativa: se o usuário marcou ruptura mas deixou o peso, ele já considerou que parte/tudo foi entregue. Não devemos contar duas vezes.
- Alternativa: exibir aviso na tela quando ruptura total estiver com `peso > 0` (inconsistência de dados).

### 4. Adicionar painel de "inconsistências" (opcional)
- Pequeno alerta no topo da página Rupturas listando pedidos com dados suspeitos (peso_original idêntico em todos os itens, ou ruptura total com peso preenchido), com link para edição.

## Detalhes técnicos

- Tabela: `carregamentos_dia`
- Função afetada: `pesoNaoCarregado` em `src/lib/peso-utils.ts`
- Migração SQL para limpeza de dados (com dry-run primeiro para revisão).
- Possível ajuste em `supabase/functions/parse-pedido-pdf/index.ts` se confirmado como fonte da replicação.

## Pergunta antes de executar

Quer que eu:
- **(A)** Aplique só a correção de dados (migração) e o ajuste em `pesoNaoCarregado` para ruptura total? Resolve o número exibido imediatamente.
- **(B)** Faça A + investigue a fonte da replicação (provavelmente `parse-pedido-pdf`) para evitar que aconteça de novo?
- **(C)** Faça A + B + adicione painel de inconsistências na tela?
