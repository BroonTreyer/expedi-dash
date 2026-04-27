## Painel do Vendedor — Modo Operacional

Transformar o painel do vendedor em uma área onde ele monta pedidos (rascunho), envia para o Faturamento aprovar, e acompanha cargas/rupturas dos próprios pedidos.

### Fluxo

```text
Vendedor cria rascunho   →  Enviar para faturamento  →  Faturamento aprova  →  Painel de Vendas (atual)
   etapa: 'rascunho'         etapa: 'aguardando_faturamento'                   etapa: 'vendas'
   (editável/excluível)      (somente leitura p/ vendedor)                     (fluxo normal)
```

### Banco de dados

- Adicionar 2 novos valores na coluna `etapa` de `carregamentos_dia`: `'rascunho'` e `'aguardando_faturamento'`. (É `text`, então sem migration de enum — só convenção.)
- Vendedor enxerga apenas seus pedidos via RLS já existente. Adicionar policies de **INSERT/UPDATE/DELETE** restritas:
  - INSERT: `vendedor` pode inserir somente com `vendedor_id = get_my_vendedor_id()` e `etapa IN ('rascunho','aguardando_faturamento')`.
  - UPDATE/DELETE: `vendedor` só altera/exclui linhas próprias **enquanto etapa = 'rascunho'**. Após enviar, bloqueia.
- Filtros nas listagens existentes (Painel, Consolidado, KPIs) precisam **ignorar** `etapa IN ('rascunho','aguardando_faturamento')` para não poluir o operacional.
- Faturamento ganha bloco/aba **"Pedidos pendentes de aprovação"** filtrando `etapa = 'aguardando_faturamento'`. Botão "Aprovar" muda etapa para `'vendas'` (status `'Aguardando'`). Botão "Rejeitar" volta para `'rascunho'` com observação.

### UI do Painel do Vendedor (`/meu-painel`)

Três abas no topo + cabeçalho/KPIs já existentes:

1. **Meus Pedidos** (nova, padrão)
   - Botão **"+ Novo Pedido"** → abre o `CarregamentoDialog` em modo vendedor (com `vendedor_id` travado, sem campos de logística/transportadora).
   - Lista agrupada por status: **Rascunhos** (editável/excluível, botão "Enviar para faturamento") · **Aguardando aprovação** (somente leitura) · **Aprovados** (link para "ver no fluxo").
2. **Cargas em andamento** (já existe, renomeado) — pedidos aprovados em etapas `vendas → logistica → carregado`.
3. **Rupturas** (já existe, somente leitura) — bloco dedicado.

Mantém: KPIs, gráficos (evolução, top clientes/produtos), badge "Visão Admin" quando admin entra.

### Cadastro de cliente pelo vendedor

- Dentro do `CarregamentoDialog`, no autocomplete de cliente, botão **"+ Novo cliente"** abre mini-form (código, nome, cidade, UF, CEP).
- Adicionar policy de INSERT em `clientes` para role `vendedor` (só inserir, não editar/excluir).
- Produto continua restrito (vendedor só seleciona; se faltar, avisa o faturamento).

### Faturamento — aprovação

Nova página `/aprovacoes` (ou aba na Home do Faturamento) com:
- Lista de pedidos `etapa = 'aguardando_faturamento'` agrupados por vendedor.
- Botões em massa: **Aprovar selecionados** / **Rejeitar com motivo**.
- Notificação realtime para o vendedor quando o pedido é aprovado/rejeitado.

### Sidebar

- Vendedor: itens "Meu Painel" (novo: vai direto para aba Meus Pedidos).
- Faturamento/Admin: novo item **"Aprovações"** com badge mostrando quantos estão pendentes.

### Arquivos

**Migration**
- Adicionar policies em `carregamentos_dia` (INSERT/UPDATE/DELETE para vendedor com restrições por etapa).
- Adicionar policy de INSERT em `clientes` para role `vendedor`.

**Novos**
- `src/components/vendedor/MeusPedidos.tsx` — lista com tabs Rascunhos / Aguardando / Aprovados + botão Novo.
- `src/components/vendedor/NovoPedidoDialog.tsx` — versão simplificada do `CarregamentoDialog` (campos: cliente, produto, peso, qtd, observações; sem campos logísticos).
- `src/components/vendedor/NovoClienteInline.tsx` — mini-form embutido no autocomplete de cliente.
- `src/pages/Aprovacoes.tsx` — fila do faturamento.
- `src/hooks/useAprovacoes.ts` — fetch + mutations aprovar/rejeitar.

**Editados**
- `src/pages/MeuPainel.tsx` — adicionar Tabs "Meus Pedidos | Cargas | Rupturas".
- `src/hooks/useMeuPainel.ts` — separar pedidos por etapa (rascunho/aguardando/aprovados).
- `src/hooks/useCarregamentos.ts` (ou equivalente) — excluir `etapa IN ('rascunho','aguardando_faturamento')` das queries do painel principal e Consolidado.
- `src/components/AppSidebar.tsx` — adicionar "Aprovações" para faturamento/admin com badge de contagem.
- `src/App.tsx` — registrar rota `/aprovacoes`.

### Segurança (resumo das policies novas)

```sql
-- Vendedor cria pedidos próprios em rascunho ou aguardando
CREATE POLICY "Vendedor insere proprios pedidos"
  ON carregamentos_dia FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'vendedor')
    AND vendedor_id = get_my_vendedor_id()
    AND etapa IN ('rascunho','aguardando_faturamento')
  );

-- Vendedor altera só rascunhos próprios
CREATE POLICY "Vendedor altera rascunhos"
  ON carregamentos_dia FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'vendedor')
    AND vendedor_id = get_my_vendedor_id()
    AND etapa IN ('rascunho','aguardando_faturamento')
  )
  WITH CHECK (
    vendedor_id = get_my_vendedor_id()
    AND etapa IN ('rascunho','aguardando_faturamento')
  );

-- Vendedor exclui só rascunhos próprios
CREATE POLICY "Vendedor exclui rascunhos"
  ON carregamentos_dia FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'vendedor')
    AND vendedor_id = get_my_vendedor_id()
    AND etapa = 'rascunho'
  );

-- Vendedor cadastra clientes
CREATE POLICY "Vendedor insere clientes"
  ON clientes FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'vendedor'));
```

### Fora de escopo desta etapa

- Vendedor não vê/edita campos de logística (placa, motorista, ordem de entrega, etc.).
- Vendedor não cadastra produtos.
- Sem edição após envio: correções precisam passar por Faturamento/Admin.