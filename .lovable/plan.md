# Módulo Recebimento de Matéria Prima (MP)

Novo módulo dedicado para digitalizar as três folhas atuais (Dados para Pagamento, Anexo Doca, Recibo de Descarga) em um fluxo único, sem retrabalho, com cálculo automático, recibo imprimível e controle de pagamento/pallets.

---

## Fluxo operacional (sem falhas)

```text
1. CHEGADA            2. CONFERÊNCIA          3. PAGAMENTO         4. LIBERAÇÃO
   (Portaria/Recep.)     (Recebimento/Doca)      (Financeiro)         (Portaria)

   ┌──────────────┐     ┌──────────────────┐   ┌─────────────────┐  ┌────────────┐
   │ Registrar    │ ──► │ Adicionar 1..N   │──►│ Calcula total   │─►│ Confirma   │
   │ motorista,   │     │ produtos, NF,    │   │ R$35 × ton      │  │ pagamento, │
   │ telefone,    │     │ fornecedor,      │   │ Forma (PIX/$)   │  │ anexa      │
   │ CPF, placa,  │     │ conferente,      │   │ Status pendente │  │ comprov.,  │
   │ data/hora    │     │ pallets          │   │ → pago          │  │ libera     │
   └──────────────┘     └──────────────────┘   └─────────────────┘  └────────────┘
        │                       │                      │                  │
        ▼                       ▼                      ▼                  ▼
   status:                 status:                status:            status:
   "Aguardando            "Aguardando            "Pago"            "Liberado"
   descarga"              pagamento"                                (saída registrada)
```

Regra de bloqueio (igual ao modelo manual "Liberação só após pagamento"): a etapa 4 só é habilitada quando `pagamento_status = 'pago'` e existe comprovante anexado.

---

## Estrutura de dados (Lovable Cloud)

### Tabelas novas

**`fornecedores_mp`** — cadastro de fornecedores de matéria-prima
- nome, cnpj_cpf, telefone, email, cidade, uf, ativo

**`produtos_mp`** — cadastro de matérias-primas
- codigo, nome, unidade_padrao (`ton` default), ativo

**`recebimentos_mp`** — cabeçalho do recebimento (1 caminhão = 1 registro)
- data_chegada, hora_chegada, data_recebimento, data_descarga
- motorista (nome), telefone, cpf, placa, tipo_veiculo
- fornecedor_id, conferente, doca_setor
- pallets_quantidade, pallets_devolvidos (bool)
- peso_total_ton (calculado), valor_tonelada (default 35,00, configurável em `app_settings`), valor_total (calculado)
- forma_pagamento (`dinheiro` | `pix` | `transferencia`), pagamento_status (`pendente` | `pago`), pago_em, pago_por, comprovante_url
- status_geral (`aguardando_descarga` | `descarregando` | `aguardando_pagamento` | `pago` | `liberado` | `cancelado`)
- observacoes, recibo_numero (sequencial diário), foto_nota_url
- vinculo_movimentacao_portaria_id (opcional — liga ao registro da Portaria se houver)

**`recebimentos_mp_itens`** — produtos do recebimento (1..N)
- recebimento_id (FK lógica), produto_id, nome_produto (snapshot), nota_fiscal, peso_ton, valor_unitario (snapshot do R$/ton), valor_total_linha

### Configuração
- `app_settings.key = 'recebimento_mp'` → `{ "valor_tonelada": 35.00, "pix_chave": "(62) 99969-2686", "banco": "SICOOB", "cnpj": "07.014.305.0001-00", "email_comprovante": "compras@frico.ind.br", "whatsapp_comprovante": "(62) 99607-5751" }`

### Storage
- Bucket privado `recebimento-mp` para fotos de NF e comprovantes de pagamento (signed URLs 1 ano, padrão do projeto).

### RLS
- `admin`, `logistica`, `portaria`, `faturamento` → SELECT
- `admin`, `logistica`, `portaria` → INSERT/UPDATE de recebimentos
- `admin`, `faturamento` → UPDATE de pagamento
- `admin` → DELETE
- Cadastros (`fornecedores_mp`, `produtos_mp`): SELECT autenticado; INSERT/UPDATE admin+logistica+faturamento

### Triggers
- `set_recibo_numero` — sequencial diário (RECMP-AAAAMMDD-NNN) no INSERT
- `recalc_recebimento_total` — soma `peso_ton` e `peso × valor_unitario` dos itens e grava em `recebimentos_mp` (AFTER INSERT/UPDATE/DELETE em `recebimentos_mp_itens`)
- `audit_recebimentos_mp` — usa o padrão `audit_generic_cadastro` existente para timeline/auditoria
- `notify_recebimento_aguardando_pagamento` — notifica role `faturamento` ao mudar status para `aguardando_pagamento`
- `update_updated_at_column` em ambas as tabelas

---

## Interface (4 telas + dialogs)

### 1. `/recebimento-mp` (lista principal)
- KPIs do dia: Aguardando descarga · Aguardando pagamento · Pago hoje · Total ton hoje · Total R$ hoje
- Filtros: data (default hoje), status, fornecedor, busca por placa/motorista
- Tabela com: recibo nº, hora chegada, placa, motorista, fornecedor, ton, R$ total, status (badge), ações
- Botão **"Registrar Chegada"** (abre dialog 2)
- Botão **"Imprimir do dia"** (consolidado A4)

### 2. Dialog "Registrar Chegada"
Réplica fiel da folha 1 (Anexo Doca), em uma única tela:
- Bloco 1 — Motorista: Motorista, Telefone (máscara), CPF (máscara), Placa (uppercase)
- Bloco 2 — Datas: Data chegada (default hoje), Hora chegada (default agora), Data recebimento
- Botão **Salvar** → cria `recebimentos_mp` com status `aguardando_descarga`

### 3. Dialog "Conferência / Adicionar Produtos"
Aberto ao clicar em uma linha em status `aguardando_descarga`:
- Cabeçalho readonly (motorista, placa)
- Bloco Produtos — tabela editável estilo planilha (folha 3):
  - linha: Produto (autocomplete `produtos_mp` + livre), Nota Fiscal, Peso (ton, máscara pt-BR), R$/ton (preenche default 35,00), Total (calculado)
  - "+ Adicionar produto" (até N linhas)
- Bloco Recebimento: Fornecedor (autocomplete + criar inline), Conferente, Doca/Setor
- Bloco Pallets: Quantidade · Devolveu Pallets? Sim/Não
- Anexo: foto da NF (CapturaFoto reusada da Portaria)
- Rodapé: **Subtotal ton** · **Valor total R$** ao vivo
- Botão **Confirmar Descarga** → status `aguardando_pagamento`, dispara notificação para `faturamento`

### 4. Dialog "Pagamento"
- Resumo: fornecedor, ton, valor total
- Forma de pagamento (radio: Dinheiro · PIX · Transferência)
- Upload de comprovante (obrigatório para confirmar)
- Botão **Marcar como Pago** → status `pago`, grava `pago_em`/`pago_por`
- Botão **Liberar Caminhão** (somente se pago) → status `liberado`

### 5. Dialog "Recibo de Descarga" (PDF imprimível)
Réplica fiel da folha 3 (Recibo de Descarga):
- Cabeçalho: logo Fricó, "Recibo de Descarga", data, hora, nº recibo
- Fornecedor
- Tabela de itens: Quant. · Ton · Descrição/NF · R$/ton · Total
- Rodapé: Subtotal R$, A Recebedor (assinatura), QR code opcional com dados do pagamento
- "Imprimir" usa o mesmo padrão de `ComprovantePortariaDialog` (janela popup com CSS A4)
- Adicional: bloco "Dados para pagamento" (folha 2) com Banco SICOOB, PIX, CNPJ, e-mail, WhatsApp (vindos de `app_settings`)

---

## Integração com módulos existentes

- **Portaria**: nova categoria opcional `recebimento_mp` em `movimentacoes_portaria` para registrar entrada/saída do caminhão. Vínculo manual (não obrigatório) via `vinculo_movimentacao_portaria_id`. Não interfere no fluxo de expedição.
- **Menu lateral** (`AppSidebar`): novo item "Recebimento MP" (ícone Truck/PackageOpen), visível para `admin`, `logistica`, `portaria`, `faturamento`.
- **Cadastros**: novas abas "Fornecedores MP" e "Produtos MP" em `/cadastros`.
- **Audit log**: trilha completa de criação/edição/pagamento/liberação.

---

## Detalhes técnicos

- **Cálculo automático e à prova de erro**: trigger DB recalcula `peso_total_ton` e `valor_total` ao mudar qualquer item; UI também calcula em tempo real (mesma fórmula) para feedback imediato. Single source of truth = banco.
- **Numeração de recibo**: função `next_recibo_mp(data)` análoga a `next_numero_pedido`, evita colisões em concorrência.
- **Validações**: trigger garante que `pagamento_status='pago'` exige `comprovante_url` e `forma_pagamento`; `status_geral='liberado'` exige `pagamento_status='pago'`.
- **Formato pt-BR**: 1.234,5 ton; R$ 1.234,56; dd/MM/yyyy HH:mm — coerente com o padrão do projeto.
- **Mobile-first**: dialogs empilham campos no mobile (padrão atual).
- **Realtime**: `recebimentos_mp` na publicação `supabase_realtime` para atualização instantânea entre Portaria/Recebimento/Faturamento (debounce 1.5s).

---

## Entregáveis

1. Migração SQL: 4 tabelas + RLS + triggers + função numeração + bucket
2. Hook `useRecebimentosMp`, `useFornecedoresMp`, `useProdutosMp`
3. Página `src/pages/RecebimentoMp.tsx` (lista + KPIs)
4. Dialogs: `RegistrarChegadaDialog`, `ConferenciaDescargaDialog`, `PagamentoDialog`, `ReciboDescargaPrintDialog`
5. Abas em Cadastros: `FornecedoresMpTab`, `ProdutosMpTab`
6. Item no `AppSidebar` + rota em `App.tsx`
7. Memória atualizada (`mem://features/recebimento-mp`)

Sem alterações no fluxo Pré-carga → Consolidado → Expedição.
