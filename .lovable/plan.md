## Diagnóstico

O pedido **85 do cliente 21405** tem `quantidade` e `quantidade_original` inconsistentes em todos os 10 itens. Exemplo do "PAO DE ALHO PICANTE 10x400g" (carga 811):

| Campo | Valor no banco |
|---|---|
| `quantidade` | 30 |
| `quantidade_original` | **13** |
| `peso` | 12 |
| `peso_original` | 12 |
| `ruptura` | true |

- O **Painel/Carregamento** mostra `quantidade` (30 unid ou 12 kg) → o "estado atual" do pedido.
- A aba **Rupturas** mostra `quantidade_original` (13 unid) → o "que foi pedido originalmente", porque ruptura total significa "perdemos tudo que foi pedido". Lógica em `src/pages/Rupturas.tsx:223-227`.

O valor "13" se repete **idêntico em todos os 10 itens** do pedido 85, e "23" idêntico em todos os 23 itens do pedido 1 do mesmo cliente. Isso não é coincidência — é um bug de gravação, não de exibição.

## Causa raiz provável

Em `src/hooks/useEditarPedidoAprovacao.ts:67`, ao salvar uma edição em Aprovações:

```ts
quantidade_original: it.quantidade,
```

Esse "rebase de baseline" sobrescreve o original com a quantidade atual da linha — mas o padrão idêntico em todos os itens sugere que, em algum fluxo (edição em massa, importação ou clonagem), `it.quantidade` recebeu um valor compartilhado entre todas as linhas antes do save, gravando o mesmo número em todas. Preciso reproduzir o caminho exato; o sintoma já é suficiente para tratar.

## Plano

### 1. Corrigir os dados existentes do pedido afetado
Para os registros do pedido 85 (e quaisquer outros pedidos com mesmo padrão "todos itens com `quantidade_original` idêntico ≠ `quantidade`"), realinhar `quantidade_original = quantidade` e `peso_original = peso`, já que `peso_original` já está correto e `quantidade_original` é o único divergente. Isso fará a aba Rupturas mostrar 30 unid em vez de 13 para esse item.

Migration SQL (somente UPDATE direcionado, sem mexer em outros pedidos):

```sql
UPDATE carregamentos_dia
SET quantidade_original = quantidade
WHERE numero_pedido IN (85, 1)
  AND codigo_cliente = '21405'
  AND quantidade_original IS DISTINCT FROM quantidade;
```

### 2. Blindar a origem do bug
Em `useEditarPedidoAprovacao.ts`, só rebasear `quantidade_original`/`peso_original` quando o item **não estiver em ruptura** (mesma lógica defensiva que já existe para `ruptura_sinalizada`). Em itens com `ruptura=true`, o "original" deve permanecer como o pedido realmente solicitado — não deve ser reescrito pelo valor da edição. Isso evita que futuras edições em Aprovações zerem ou achatem o baseline de itens já em ruptura.

### 3. Validação visual
Após o UPDATE, abrir a aba Rupturas filtrando pelo pedido 85 e conferir se "PAO DE ALHO PICANTE" passa a mostrar 30 UNID (igual ao Painel) em vez de 13.

## Fora do escopo
- Não vou alterar a fórmula de `pesoNaoCarregado` nem a regra "ruptura total = original" — essa regra está correta; o problema é o dado de origem.
- Não vou rodar correção em massa em outros clientes/pedidos sem você confirmar o escopo.

## Pergunta para você
Antes de aplicar a migration corrigindo os dados: além do pedido 85 (e do pedido 1 que mostra o mesmo padrão), quer que eu rode uma varredura listando **todos** os pedidos com esse sintoma (`quantidade_original` idêntico em ≥3 itens do mesmo pedido e ≠ `quantidade`) para você decidir corrigir em lote, ou prefere corrigir só o pedido 85 agora?