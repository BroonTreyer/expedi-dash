# Forma de pagamento no pedido do vendedor

Adicionar um campo **Forma de pagamento** obrigatório no dialog de novo pedido do vendedor. Como todas as opções são boletos, o campo será um único select com as variações de prazo combinadas. Faturamento verá no momento da aprovação e o dado entra nas impressões/relatórios.

## Opções disponíveis (select fixo)
- Boleto 15 dias
- Boleto 21 dias
- Boleto 28 dias
- Boleto 30 dias
- Boleto 35 dias
- Boleto 21/28 dias
- Boleto 21/28/35 dias

## Mudanças

### 1. Banco (`carregamentos_dia`)
Adicionar coluna `forma_pagamento text` (nullable) via migração. Pedidos antigos ficam sem valor, novos exigem preenchimento no front. Atualizar trigger `audit_carregamentos` para registrar mudanças nesse campo no log de auditoria.

### 2. Dialog do vendedor (`src/components/vendedor/NovoPedidoDialog.tsx`)
- Novo `Select` com as 7 opções acima, posicionado logo abaixo da seção Cliente, antes dos Itens.
- Estado local `formaPagamento`, hidratado quando `editing` traz valor.
- Adicionar `forma_pagamento` em `NovoPedidoSubmit`.
- `isValid` exige `formaPagamento` preenchido (campo obrigatório, sempre — bloqueia tanto rascunho quanto envio para faturamento).
- Label com asterisco e mensagem de validação visual.

### 3. Submit (`src/components/vendedor/MeusPedidos.tsx`)
Incluir `forma_pagamento: payload.forma_pagamento` em todos os 3 caminhos de gravação:
- INSERT de novos itens (criação)
- UPDATE de itens existentes (edição)
- INSERT de novos itens dentro de uma edição

Ao hidratar o `editing` para o dialog, repassar o `forma_pagamento` do primeiro irmão do grupo.

### 4. Aprovações (faturamento)
Mostrar a forma de pagamento no card de cada pedido pendente em `src/pages/Aprovacoes.tsx` e no `src/components/aprovacoes/EditarPedidoAprovacaoDialog.tsx` (campo somente-leitura ou editável pelo faturamento, mantendo a validação de obrigatoriedade).

### 5. Impressões / relatórios
- `src/components/dashboard/CargaPrintDialog.tsx`: incluir "Forma de pagamento" no cabeçalho de cada pedido do manifesto A4.
- `src/components/dashboard/ConsolidadoPrintDialog.tsx`: idem.
- `src/hooks/useRelatorios.ts` (Resumo Diário e Performance de Vendedor XLSX): adicionar coluna `Forma de pagamento`.

## Itens deliberadamente fora
- Não aparece na lista "Meus Pedidos" do vendedor nem no Dashboard de carregamento (conforme escolhido).
- Sem tabela auxiliar de formas de pagamento — lista é fixa em `src/lib/constants.ts` (`FORMAS_PAGAMENTO`) para fácil ajuste futuro.

## Detalhes técnicos
- Tipagem: o select usa um union literal exportado de `constants.ts` para evitar typos.
- RLS já permite vendedor inserir/atualizar a coluna (políticas são por linha, não por coluna).
- `types.ts` do Supabase é regenerado automaticamente após a migração — nenhum ajuste manual.
- Pedidos antigos sem `forma_pagamento` continuam visíveis; só **novos** envios exigem o campo.
