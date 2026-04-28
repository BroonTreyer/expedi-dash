Auditoria concluída. Encontrei evidências fortes de que a duplicidade não está vindo principalmente do botão “aprovar” simples, mas sim dos fluxos do faturamento que criam/clonam/editam pedidos pelo painel operacional.

## O que a auditoria encontrou

1. Duplicatas reais no banco
- Existem grupos com 2 e 3 linhas fisicamente duplicadas em `carregamentos_dia`.
- Nos últimos 30 dias, a maior parte dos grupos duplicados foi criada pelo usuário de faturamento.
- Resultado da auditoria por criador:
  - `faturamento@frico.ind.br`: 23 linhas em 11 grupos duplicados
  - `debora@frico.ind.br`: 2 linhas em 1 grupo duplicado

2. A coluna de idempotência não está protegendo o fluxo do faturamento
- A tabela tem `operation_id`, mas no banco atual há 0 registros com `operation_id` preenchido.
- Ou seja: os fluxos que o faturamento usa com mais frequência ainda estão inserindo sem trava anti-duplicação.

3. O principal fluxo suspeito é o painel operacional, não só “Aprovações”
- Em `CarregamentoDialog` + `Index`, o faturamento pode:
  - criar pedido,
  - editar pedido completo,
  - clonar pedido,
  - inserir itens extras via `_batch`.
- Esse caminho usa `useBatchCreateCarregamento`, que hoje faz `insert(rows)` direto, sem `operation_id`, sem chave lógica e sem proteção forte contra reenvio.

4. O botão de clonar é um risco alto
- A tabela mostra botão “Editar pedido completo” e logo ao lado “Clonar pedido”.
- O clone cria novas linhas a partir de dados existentes e pode copiar inclusive carga, status e logística.
- A auditoria encontrou registros criados pelo faturamento já com `carga_id`, `etapa = logistica` e `status = Pendente / Problema`, típico de clone/duplicação de item já operacional.

5. O fechamento do modal reseta a trava cedo demais
- `CarregamentoDialog` chama `onSubmit(...)` e fecha o modal imediatamente.
- Ao fechar, ele reseta a trava interna (`submitGuard`).
- Como a mutation ainda pode estar rodando, isso abre janela para reentrada/reenvio e duplicação.

6. `numero_pedido` quase não está sendo usado
- 99,6% dos registros estão com `numero_pedido = null`.
- Vários agrupamentos e cascatas dependem de `numero_pedido`; quando ele está vazio, o sistema agrupa por `created_at` ou não consegue encontrar “irmãos” do mesmo pedido de forma segura.
- Isso aumenta o risco de editar uma linha e gerar/inserir outra em vez de atualizar o conjunto correto.

7. A edição em Aprovações melhorou, mas ainda não é transacional
- `useEditarPedidoAprovacao` faz DELETE, UPDATE e INSERT em passos separados.
- Se houver falha parcial, refresh ou concorrência, pode deixar o pedido em estado inconsistente.
- Também usa `operation_id` apenas nos itens novos, não em uma transação atômica do pedido inteiro.

## Plano de correção

### 1. Blindar o fluxo operacional usado pelo faturamento
- Atualizar `useCreateCarregamento` e `useBatchCreateCarregamento` para sempre enviar chave de operação/linha.
- Impedir que qualquer insert manual do faturamento entre sem identificador idempotente.
- Tratar erro de duplicidade como sucesso quando for o mesmo envio repetido.

### 2. Corrigir o fechamento prematuro do modal
- Em `CarregamentoDialog`, transformar `onSubmit` em fluxo aguardável.
- Só fechar o modal depois que o insert/update terminar com sucesso.
- Não resetar `submitGuard` enquanto a mutation estiver pendente.
- Manter botão “Salvar” bloqueado durante todo o envio real.

### 3. Separar claramente “Editar” de “Clonar”
- Para reduzir erro operacional do faturamento:
  - deixar “Clonar pedido” menos próximo do botão editar;
  - exigir confirmação antes de clonar;
  - mostrar aviso: “Isso criará um novo pedido, não editará o existente”.
- Ao clonar, limpar campos operacionais perigosos por padrão:
  - `carga_id`, `nome_carga`, `placa`, `motorista`, `transportadora`, `ordem_entrega`, horários, status operacional e etapa logística.
- Clone deve voltar como novo pedido de vendas, não como duplicata de carga fechada.

### 4. Criar uma chave lógica segura para evitar duplicatas reais
- Adicionar uma chave de deduplicação por linha, por exemplo `idempotency_key` ou composição equivalente.
- Criar índice único parcial para impedir a repetição do mesmo envio.
- Não usar somente `(operation_id, codigo_produto)`, porque um pedido legítimo pode ter duas linhas do mesmo produto.
- A nova chave deve considerar linha/posição do item ou UUID por linha.

### 5. Fortalecer edição de pedido completo
- Quando editar um pedido completo, classificar com segurança:
  - linhas existentes: UPDATE por `id`;
  - linhas removidas: DELETE explícito;
  - linhas novas: INSERT com chave idempotente;
  - nunca recriar linhas existentes.
- Aplicar isso tanto no painel operacional quanto no fluxo de Aprovações.

### 6. Corrigir dependência de `numero_pedido = null`
- Garantir que novos pedidos criados pelo faturamento também recebam `numero_pedido` quando aplicável.
- Para registros antigos sem número, usar agrupamento por chave mais estável: vendedor + data + cliente + timestamp/lote + carga quando necessário.
- Evitar cascatas que só funcionam quando `numero_pedido` existe.

### 7. Adicionar auditoria preventiva no código
- Registrar audit log agregado para operações de criar, clonar e editar pedido completo.
- Incluir `operation_id`, tipo da operação e origem: `criar`, `editar`, `clonar`, `aprovar`.
- Isso vai permitir provar exatamente de onde veio qualquer duplicata futura.

### 8. Relatório de duplicatas existentes, sem apagar nada automaticamente
- Criar uma query/relatório para listar duplicatas existentes com:
  - cliente,
  - produto,
  - data,
  - carga,
  - usuário criador,
  - horários de criação,
  - IDs envolvidos.
- Não remover dados automaticamente nesta etapa.
- Depois, se você aprovar, fazemos uma limpeza controlada com confirmação e preservação da linha mais antiga/mais atual conforme regra definida.

## Arquivos que serão alterados

- `src/components/dashboard/CarregamentoDialog.tsx`
- `src/pages/Index.tsx`
- `src/hooks/useCarregamentos.ts`
- `src/hooks/useEditarPedidoAprovacao.ts`
- `src/components/aprovacoes/EditarPedidoAprovacaoDialog.tsx`
- Possivelmente `src/components/dashboard/CarregamentoTable.tsx` para melhorar/confirmar o botão de clone
- Nova migration para reforço de idempotência no banco

## Resultado esperado

Depois da correção:
- editar pedido não vai criar nova linha indevida;
- duplo clique/reenvio não vai duplicar;
- clone não será confundido com edição;
- clone não copiará carga/logística de pedido já fechado;
- novos pedidos terão rastreabilidade por operação;
- duplicatas futuras serão bloqueadas no banco, não apenas na interface.