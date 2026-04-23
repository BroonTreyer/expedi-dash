

## Cálculo bidirecional Peso ↔ Qtd no Importar PDF

### Problema

No dialog **Importar PDF** os campos **Peso (kg)** e **Qtd** são independentes: editar um não atualiza o outro. No **Adicionar Pedido** (`CarregamentoDialog`) eles são vinculados pelo `peso_padrao` do produto (ex.: Calabresa 2,5 kg → Qtd 4 vira Peso 10; Peso 10 vira Qtd 4).

### Mudança

Replicar a mesma inteligência do `CarregamentoDialog` dentro de `ImportarPedidoPdfDialog.tsx`, reaproveitando `isPorUnidade` (já importado).

#### Regras (idênticas às do Adicionar Pedido)

1. **Editar Qtd** → se `pesoPadrao > 0`: `peso = pesoPadrao × qtd`. Senão, só atualiza `quantidade`.
2. **Editar Peso** → 
   - Produto **por unidade** (ex.: Pão de Alho) **ou** sem `pesoPadrao`: só atualiza `peso`, `pesoManual = true`.
   - Produto normal com `pesoPadrao > 0`: `quantidade = round(peso / pesoPadrao)`, `pesoManual = true`.
3. **Trocar código do produto** → recarrega `pesoPadrao` e recalcula `peso = pesoPadrao × quantidade` (quando há qtd e peso padrão), mantendo a mesma UX do Adicionar Pedido.

#### Inicialização do parsing (corrigir interpretação do PDF)

Hoje, ao ler o PDF, para itens em KG considera-se que `quantidade = peso` (e por isso aparece "Peso 40 / Qtd 0" na tela do usuário). Com a nova lógica:

- A coluna **Qtde** do PDF do Sankhya é **sempre quantidade de embalagens** (4, 8, 12 packs etc.), mesmo quando a `Emb.` é KG — o "peso" físico do pacote vem do `peso_padrao` do produto (Calabresa 2,5 kg, Apresuntado 3,725 kg, Presunto 3,4 kg).
- Portanto, na conversão `parsedToPedido`:
  - `quantidade = it.quantidade` (do PDF, como veio).
  - `peso = pesoPadrao × quantidade` quando `pesoPadrao > 0`.
  - Se o produto é **por unidade** (Pão de Alho): mesma fórmula `peso = pesoPadrao × qtd`.
  - Se o produto **não está cadastrado** (sem `pesoPadrao`): `peso = quantidade` como fallback (mantém comportamento atual para não perder o dado), com badge "novo" já existente alertando o usuário.

### Arquivo afetado

- `src/components/dashboard/ImportarPedidoPdfDialog.tsx`:
  - Adicionar handlers `handleItemQuantidade(fileId, idx, qty)` e `handleItemPeso(fileId, idx, peso)` espelhando `CarregamentoDialog`.
  - Trocar os `onChange` dos inputs **Qtd** (linha 449) e **Peso** (linha 439) para usá-los.
  - No `onChange` do código do produto (linhas 411-419), recalcular `peso = pesoPadrao × quantidade` quando aplicável (mesmo padrão do `handleItemCodigo` do Adicionar Pedido).
  - Ajustar `parsedToPedido` (linhas 124-143): inicializar `peso = pesoPadrao × qtd` para qualquer produto cadastrado (não distinguir mais "KG vs unidade" no parsing — `pesoPadrao` já resolve).

### Fora do escopo

- Edge function `parse-pedido-pdf`, schema da IA, `CarregamentoDialog`, banco, RLS.

### Resultado

Ao revisar um pedido importado:

- Calabresa (peso padrão 2,5 kg) com Qtd `4` no PDF → mostra **Peso 10 / Qtd 4**.
- Mudou Qtd para `5` → Peso vira `12,5` automaticamente.
- Mudou Peso para `7,5` → Qtd vira `3` automaticamente.
- Pão de Alho (por unidade) → digitar Peso só altera o peso, sem mexer em Qtd, igual ao Adicionar Pedido.

