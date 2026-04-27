# Edição de Pedidos em Aprovações (Faturamento)

## Situação atual
A tela `/aprovacoes` só permite **Aprovar** ou **Devolver** o pedido ao vendedor. Não existe edição inline. Se o Faturamento detecta um erro (peso, quantidade, preço, produto, observação), só pode devolver — o que gera retrabalho para o vendedor.

A RLS já permite Faturamento atualizar `carregamentos_dia` (`Ops update carregamentos_dia` cobre admin/faturamento/logística). Ou seja, **a infraestrutura de banco já suporta** a edição. Falta apenas a UI.

## O que será entregue

### 1. Botão "Editar" em cada card de pedido (Aprovações)
- Adicionar botão `Editar` no card do grupo (junto ao checkbox), visível apenas para `faturamento` e `admin`.
- Abre um diálogo de edição reutilizando o mesmo padrão do `NovoPedidoDialog` do vendedor, mas em modo "edição faturamento".

### 2. Diálogo de edição (`EditarPedidoAprovacaoDialog`)
Permite ajustar, para cada item do grupo (mesmo `vendedor_id + data + numero_pedido + codigo_cliente`):
- **Produto** (combobox com busca por código/nome — mesmo componente `ProdutoCombobox`)
- **Peso (kg)** e **Quantidade** com cálculo bidirecional (regra `peso_manual: true` quando o usuário digita peso à mão — preserva a memória existente)
- **Preço unitário** e **Preço total** (cálculo bidirecional baseado em peso)
- **Motivo da ruptura / observação do item** (opcional)
- **Observações gerais do pedido** (campo único ao final, propagado a todos os itens do grupo)
- Permitir **adicionar item** ou **remover item** dentro do grupo
- Campos do cliente (nome/cidade/UF/código) ficam **read-only** — alterar cliente exige devolver ao vendedor

### 3. Persistência
- `UPDATE` por item para campos editados (peso, quantidade, preco_unitario, preco_total, codigo_produto, nome_produto, motivo_ruptura, peso_manual, observacoes)
- `INSERT` para itens adicionados (mesma `etapa = 'aguardando_faturamento'`, mesmo `vendedor_id`, mesmo `numero_pedido`, mesmo `data`, mesmo `codigo_cliente/cliente/cidade/uf`)
- `DELETE` para itens removidos
- Tudo dentro de **uma única operação lógica** com `operation_id` (uuid) passado ao `log_audit` para que o histórico mostre como uma única edição
- Após salvar: invalida `aprovacoes-pendentes` e `carregamentos` (React Query)

### 4. Auditoria e rastreabilidade
- Cada UPDATE já dispara `audit_carregamentos` (trigger existente) — sem mudanças de schema
- Adicionamos um registro extra via `log_audit` com `action = 'editado_em_aprovacao'` e `changes` resumindo o diff agregado, para a timeline de auditoria mostrar "Faturamento editou pedido antes de aprovar"

### 5. UX
- Botão **"Salvar e aprovar"** dentro do diálogo (atalho: salva edições + chama o mesmo fluxo de aprovação para o grupo)
- Botão **"Salvar"** (apenas persiste, mantém na fila de aprovação)
- Botão **"Cancelar"** (descarta)
- Toast de sucesso/erro em pt-BR
- Layout responsivo (mobile-first, mesmo padrão do `NovoPedidoDialog` recém-redesenhado): items em cards empilháveis, sem scroll horizontal

## Arquivos a alterar/criar

**Criar:**
- `src/components/aprovacoes/EditarPedidoAprovacaoDialog.tsx` — diálogo de edição
- `src/hooks/useEditarPedidoAprovacao.ts` — mutation que faz UPDATE/INSERT/DELETE em lote + log de auditoria

**Editar:**
- `src/pages/Aprovacoes.tsx` — botão "Editar" por card, abrir diálogo, passar grupo selecionado
- `src/hooks/useAprovacoes.ts` — expor invalidação compartilhada (já existe, só reaproveitar)

**Reutilizar (sem alterar):**
- `src/components/vendedor/ProdutoCombobox.tsx` — busca de produto
- Lógica de cálculo bidirecional Peso ↔ Quantidade ↔ Preço (extrair do `NovoPedidoDialog` para um util compartilhado em `src/lib/pedido-calc.ts` se ainda não existir)

## Considerações de segurança
- **RLS já cobre**: `Ops update/insert/delete carregamentos_dia` permite faturamento editar/excluir/inserir
- O botão "Editar" aparece apenas via checagem de role no frontend (`useUserRole`) — defesa em profundidade já garantida pelo RLS
- Não permite alterar `vendedor_id` (mantém atribuição original) nem `etapa` (continua `aguardando_faturamento` até aprovar)

## Não está no escopo
- Edição em massa de múltiplos pedidos simultâneos (apenas 1 grupo por vez)
- Alteração de cliente (continua exigindo devolver ao vendedor)
- Edição depois de aprovado (aí volta para o fluxo normal de logística)
