
# Corrigir clonagem para copiar o pedido inteiro

## Entendimento do problema
Hoje o clone está sendo disparado a partir de uma linha de produto, e o código tenta buscar os “irmãos” do pedido usando `numero_pedido + data`. Mesmo assim, na prática o dialog continua vindo com apenas 1 item.

Pelo código atual, existem 2 fragilidades que explicam isso:

1. **O clone depende de `numero_pedido` estar consistente em todas as linhas**
   - `src/pages/Index.tsx` usa:
   - `carregamentos.filter(r => r.numero_pedido === c.numero_pedido && r.data === c.data)`
   - Se alguma linha do mesmo pedido estiver sem `numero_pedido`, com valor diferente, ou se o agrupamento visual do pedido não estiver refletindo esse critério, o clone pega só a linha clicada.

2. **A tabela agrupa por cliente, não por pedido**
   - `src/components/dashboard/CarregamentoTable.tsx` usa `codigo_cliente` para formar grupos visuais.
   - Então o usuário enxerga um “pedido” agrupado visualmente, mas a ação de clone ainda está baseada em `numero_pedido`.
   - Isso pode causar diferença entre o que aparece como conjunto na tela e o que realmente está sendo clonado.

## Solução proposta
Vou ajustar o clone para ser **determinístico e alinhado com o pedido real exibido na tabela**:

### 1. `src/components/dashboard/CarregamentoTable.tsx`
- Alterar o callback de clone para receber o **grupo inteiro** quando a linha faz parte de um conjunto expandido/agrupado
- Em vez de sempre chamar `onClone(c)`, passar:
  - item único quando for pedido simples
  - lista completa de itens quando for pedido com múltiplos produtos

Exemplo da ideia:
- adicionar uma prop como `onCloneGroup?: (items: Carregamento[]) => void`
- nos grupos multi-item, o botão de clone do cabeçalho do grupo clona todos os produtos daquele conjunto
- opcionalmente, o clone dentro das linhas internas também chama o clone do grupo inteiro, para evitar comportamento ambíguo

### 2. `src/pages/Index.tsx`
- Trocar a lógica de `handleClone` para aceitar diretamente a **coleção completa de itens a clonar**
- Manter fallback por `numero_pedido + data` apenas quando necessário
- Sempre definir:
  - `cloneItems = itens completos do pedido`
  - `editing = primeiro item do lote com id temporário`
  - `numero_pedido = null`

Fluxo novo:
```text
Clique em clonar
→ tabela identifica todos os itens do pedido
→ página recebe array completo
→ dialog é aberto com todos os produtos
→ save faz INSERT em lote
```

### 3. `src/components/dashboard/CarregamentoDialog.tsx`
- Manter o suporte a `cloneItems`
- Ajustar a inicialização para usar **sempre `cloneItems` quando ele existir**, mesmo se vier apenas 1 item
- Garantir que a lista de produtos do dialog seja montada exclusivamente a partir desse array no fluxo de clone
- Preservar o tratamento de `id` temporário (`clone-*`) como INSERT

### 4. Validação do fluxo
Depois de implementar, validar estes cenários:
- clonar pedido com 1 produto
- clonar pedido com 2+ produtos
- clonar a partir da linha interna do grupo
- clonar a partir do cabeçalho do grupo
- editar quantidades/produtos após clonar
- salvar e confirmar que foi criado um novo pedido com todas as linhas

## Arquivos afetados
- `src/components/dashboard/CarregamentoTable.tsx`
- `src/pages/Index.tsx`
- `src/components/dashboard/CarregamentoDialog.tsx`

## Detalhe técnico importante
O ponto principal da correção é: **parar de depender apenas de um filtro indireto no `Index.tsx` para descobrir o pedido inteiro**. A tabela já sabe quais itens estão no grupo exibido para o usuário; então o clone deve usar esse conjunto diretamente. Isso torna a solução mais eficiente, mais previsível e muito mais fiel ao que você está pedindo: clonar o pedido completo, com todos os produtos.
