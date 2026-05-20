
# Refazer Recebimento MP do zero

Reconstrução completa do módulo para destravar análise de compras por produto, fechamento mensal e tratamento correto dos dados (ton vs kg, R$/ton). Banco e UI serão refeitos; dados antigos de MP serão descartados (com snapshot de segurança antes).

---

## Fase 1 — Banco de dados (do zero, com snapshot)

### 1.1 Backup automático antes de apagar
- Snapshot JSONB de `recebimentos_mp`, `recebimentos_mp_itens`, `fornecedores_mp`, `produtos_mp` em `data_snapshots` com descrição "Pré-refatoração Recebimento MP".

### 1.2 Drop e recriação
Apagar tabelas atuais e recriar com modelo enxuto, normalizado e indexado para análise mensal:

- **`mp_fornecedores`** — nome, cnpj_cpf, telefone, email, cidade/uf, ativo.
- **`mp_produtos`** — codigo, nome, **categoria** (ex: óleo, embalagem, insumo), unidade_padrao (ton/kg/un), preco_referencia_ton, ativo.
- **`mp_recebimentos`** (cabeçalho da descarga) — recibo_numero, data_chegada, hora_chegada, data_descarga, fornecedor_id+nome, motorista, cpf, telefone, placa, tipo_veiculo, conferente, doca, pallets_qtd, pallets_devolvidos, **peso_total_ton** (calculado), **valor_total** (calculado), forma_pagamento, pagamento_status, pago_em/por, comprovante_url, foto_nota_url, status_geral, observacoes.
- **`mp_recebimento_itens`** (linha por produto/NF) — recebimento_id, produto_id+snapshot nome+categoria, nota_fiscal, **peso_ton** (sempre em ton), **valor_unitario_ton**, **valor_total_linha** (gerado), ordem.
- **`mp_movimentos_pagamento`** (opcional, fase 2) — para histórico de pagamentos parciais.

### 1.3 Regras e automações
- Trigger `set_recibo_numero` — sequencial diário `RECMP-YYYYMMDD-NNN`.
- Trigger `recalc_recebimento_totais` — recalcula peso_total_ton e valor_total a partir dos itens.
- Trigger `set_valor_total_linha` — `peso_ton * valor_unitario_ton`.
- Trigger de validação: rejeitar `peso_ton > 100` sem flag `peso_confirmado=true` (anti-erro kg/ton).
- Realtime ligado em `mp_recebimentos` e `mp_recebimento_itens`.
- Índices: `(data_chegada)`, `(fornecedor_id, data_chegada)`, `(produto_id, data_chegada)`, `(pagamento_status)`.
- RLS idêntica ao padrão atual (admin/logistica/portaria/faturamento).

### 1.4 View materializável para análise
- **VIEW `mp_compras_mensal_produto`** — agregação por (ano, mês, produto_id) com: ton, valor, nº descargas, preço médio/ton, nº fornecedores distintos.
- **VIEW `mp_evolucao_preco_produto`** — por (data, produto_id): preço médio/ton diário, min, max, fornecedor mais barato/caro do dia.

---

## Fase 2 — Estrutura de navegação (sidebar interno)

Rota base `/recebimento-mp` vira shell com **sidebar lateral colapsável** (`SidebarProvider` shadcn) e sub-rotas:

```text
/recebimento-mp
├── /operacao           Operação do dia (KPIs + tabela ativa + ações)
├── /historico          Lista paginada com filtros avançados
├── /compras-produto    NOVO — análise mensal de compras por produto
├── /precos             NOVO — evolução de preço/ton por produto
├── /fechamento         NOVO — fechamento mensal (consolidado p/ financeiro)
├── /motoristas         Aggregado por motorista
├── /fornecedores       CRUD + extrato por fornecedor
└── /produtos           CRUD + categorias + preço referência
```

Sidebar com ícones lucide, colapsível em modo `icon`, destaque do item ativo via `NavLink`, header com `SidebarTrigger`. Em mobile vira off-canvas.

---

## Fase 3 — Páginas principais

### 3.1 Operação do dia
- KPIs: descargas hoje, ton recebida, R$ a pagar hoje, pallets a devolver.
- Tabela ao vivo (realtime) com ações: registrar chegada, conferir descarga, registrar pagamento, imprimir recibo.
- Botão "Importar planilha" reaproveitando dialog atual com seletor kg/ton e auto-detecção.

### 3.2 Histórico
- Filtros: período (presets: hoje/semana/mês/mês passado/personalizado), fornecedor, produto, motorista, placa, status, faixa de valor.
- Tabela com ordenação, paginação, totalizadores no rodapé.
- Export XLSX completo.

### 3.3 Compras por Produto (foco do pedido)
Layout:
- Seletor de período com **comparativo** (mês atual vs anterior vs mesmo mês ano passado).
- Tabela mestre: **Produto × Mês** com colunas ton, R$, nº descargas, preço médio/ton, **Δ% vs período comparativo** (verde/vermelho).
- Filtro por categoria de produto.
- Linha clicável → drawer com extrato detalhado: todas as descargas do produto no período (data, fornecedor, motorista, NF, ton, R$/ton, R$ total).
- Mini gráfico (sparkline) ao lado de cada produto mostrando evolução do mês.
- Export XLSX.

### 3.4 Evolução de Preços
- Seletor de até 5 produtos para comparar.
- Gráfico de linha (Recharts) com preço médio/ton ao longo do tempo (granularidade: dia/semana/mês).
- Faixa min–max sombreada.
- Tabela auxiliar: melhor preço, pior preço, preço médio, fornecedor mais econômico.

### 3.5 Fechamento Mensal
- Seletor de mês/ano.
- Cards: total ton, total R$, total pago, total pendente, nº fornecedores, ticket médio.
- Tabela por fornecedor: ton, valor, status pagamento, recibos do mês — botão "Gerar recibo consolidado" (PDF A4).
- Botão "Fechar mês" → trava edições retroativas e gera snapshot.
- Export XLSX completo do fechamento (pronto para financeiro).

### 3.6 Motoristas, Fornecedores, Produtos
- CRUDs revisados, com extrato (últimas descargas, ton total, R$ total).
- Produtos ganha campo **categoria** e **preço de referência por tonelada** (usado para alertar desvios na conferência).

---

## Fase 4 — Hooks e libs

- `useMpRecebimentos`, `useMpRecebimentoItens` (realtime).
- `useMpComprasProduto(periodo, comparativo)` — query nas views agregadas.
- `useMpEvolucaoPreco(produtoIds, granularidade)`.
- `useMpFechamentoMensal(ano, mes)`.
- `useMpFornecedores`, `useMpProdutos`, `useMpMotoristas` (aggregado a partir de recebimentos).
- `lib/mp-peso.ts` — utilitários `normalizarParaTon`, `detectarUnidade`, `formatarTon`, `formatarBRL` (mantém atual).
- `lib/mp-export.ts` — geradores XLSX padronizados pt-BR.

---

## Fase 5 — Limpeza e migração

- Apagar componentes antigos: `OperacaoDiaPanel`, `HistoricoDescargasPanel`, `DashboardMpPanel`, `MotoristasMpPanel`, `FornecedoresMpPanel`, `ProdutosMpPanel`, `MotoristaMpDetalheDrawer`, hooks `useRecebimentosMp*`, `useMotoristasMp`, `useFornecedoresMp`, `useProdutosMp`.
- Atualizar `RecebimentoMp.tsx` para virar shell com `<Outlet />`.
- Adicionar rotas no `App.tsx`.
- Atualizar `AppSidebar` se houver atalhos antigos para tabs.

---

## Detalhes técnicos

- **Tudo em toneladas no banco.** UI sempre normaliza input via `normalizarParaTon` antes de salvar; flag `peso_confirmado` para liberar valores >100 ton.
- **Preço por tonelada.** `valor_unitario_ton` no item; `valor_total_linha = peso_ton * valor_unitario_ton` (gerado). Default 35,00.
- **Categorias de produto** entram como `text` simples (não enum) para flexibilidade; UI sugere via combobox com valores já usados.
- **Comparativo mensal** calculado client-side a partir de duas chamadas à view agregada (mês atual e comparação) — barato e cacheável.
- **Realtime** apenas em `mp_recebimentos` e itens; análises usam staleTime de 60s.
- **RLS** segue padrão Cloud: admin/logistica/portaria escrevem; faturamento lê tudo + atualiza pagamento.
- **Snapshot** antes do drop garante rollback se necessário (Backups → Restaurar).
- **Mobile**: sidebar off-canvas, tabelas viram cards empilhados, formulários em coluna única.

---

## O que será descartado

- Tabela `recebimentos_mp` e `recebimentos_mp_itens` atuais (com snapshot prévio).
- Tabelas `fornecedores_mp` e `produtos_mp` atuais (migráveis manualmente do snapshot se quiser repovoar).
- Componentes e hooks listados na Fase 5.

## O que será preservado

- Bucket de storage `recebimento-mp` (continua valendo).
- Dialogs reutilizáveis: `RegistrarChegadaDialog`, `ConferenciaDescargaDialog`, `PagamentoDialog`, `ReciboDescargaPrintDialog`, `ImportarRecebimentosMpDialog` — serão adaptados aos novos nomes de tabela.
- Utilitário `lib/peso-mp.ts`.
