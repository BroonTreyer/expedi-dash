
## Fluxo de Adiantamento de Frete

Replica o que hoje é feito manualmente no WhatsApp: agrupar CT-es por transportadora, calcular adiantamento (% editável), gerar comprovante para o financeiro transferir e, depois, dar baixa na quitação do saldo.

### 1. Cadastro de Transportadoras (novo)

Nova tabela `transportadoras_financeiro` com:
- `nome` (único, normalizado UPPER)
- `codigo` (ex: "27308")
- `cnpj`, `pix_chave`, `pix_tipo` (cpf/cnpj/email/telefone/aleatoria)
- `banco`, `agencia`, `conta` (opcionais)
- `percentual_adiantamento_padrao` (default 50)
- `ativo`

Página nova **Cadastros → Transportadoras** (lista + dialog editar). Acesso: admin/logistica.

### 2. Tabelas de Adiantamento e Quitação (novas)

**`adiantamentos_frete`** — um registro por lote enviado ao financeiro:
- `id`, `numero` (sequencial diário tipo `ADT-YYYYMMDD-001`)
- `transportadora`, `transportadora_id` (FK lógica)
- `tipo_agrupamento` ('ordem' | 'lote')
- `ordem_carga` (quando agrupamento por OC)
- `valor_total_ctes` (soma dos CT-es)
- `percentual` (editável por lote)
- `valor_adiantamento` (= total × %)
- `valor_saldo` (= total − adiantamento)
- `status` ('pendente' | 'pago' | 'quitado' | 'cancelado')
- `pago_em`, `pago_por`, `comprovante_pagamento_url` (opcional)
- `quitado_em`, `quitado_por`, `comprovante_quitacao_url`
- `observacoes`, `created_at`, `created_by`

**`adiantamentos_frete_ctes`** — n:n entre adiantamento e CT-es:
- `adiantamento_id`, `cte_id` (UNIQUE pra impedir o mesmo CT-e em 2 lotes abertos)

RLS: admin/logistica fazem tudo; faturamento lê e marca como pago/quitado.

### 3. UI — Nova aba "Adiantamentos" em `/logistica`

Adicionar aba ao lado de "CT-es", "Tabela de Frete", "Gastos por Vendedor".

**Tela principal** com 3 sub-abas:

```text
[ A Pagar ]   [ Pagos / Aguardando Quitação ]   [ Quitados ]
```

#### A Pagar (montagem do lote)
- Filtro por transportadora (obrigatório pra montar lote).
- Lista de CT-es **sem adiantamento ainda**, agrupados por OC (mesma lógica da aba CT-es).
- Checkbox por CT-e e por OC inteira ("selecionar OC").
- Painel lateral fixo "Resumo do Lote":
  - Transportadora, Qtd CT-es, Valor total
  - Input `% Adiantamento` (default vem do cadastro da transportadora)
  - Mostra `Valor adiantamento` e `Saldo`
  - Botão **"Gerar Adiantamento"** → cria registro + abre dialog de comprovante
- Tabela embaixo: lotes já criados pendentes de pagamento.

#### Pagos / Aguardando Quitação
- Lotes com status `pago`. Botão **"Registrar Quitação"** abre dialog: data, observação, upload opcional do comprovante. Marca como `quitado`.

#### Quitados
- Histórico, filtro por período/transportadora, link pro PDF.

### 4. Dialog "Comprovante de Adiantamento" (estilo WhatsApp)

Modal imprimível (reusa padrão do `CargaPrintDialog`) com layout idêntico ao print enviado:

```text
ADIANTAMENTO DE FRETE CIF, FORA DO ESTADO.

1. <Transportadora> (<peso_total> Kg) CTE
   <numero1>/<numero2>/<numero3>...
   *VLR R$ <valor_total>*

   *Valor Total do Frete R$ <valor_total>*

<percentual>% de Adiantamento

*R$ <valor_adiantamento>*

Código <codigo> – <nome>
Pix: <pix_chave>
```

Botões: **Copiar texto** (clipboard, formatação WhatsApp `*negrito*`), **Imprimir/PDF**, **Marcar como Pago** (passa para sub-aba "Pagos").

### 5. Dialog "Quitação"

Layout do segundo print:

```text
QUITAÇÃO DO FRETE CIF, FORA DO ESTADO.

| VALOR EM ABERTO | COD   | TRANSPORTADORA | OC   |
| R$ 7.733,34     | 27308 | DOMINIO        | 2207 |
| R$ 6.161,31     | 27308 | DOMINIO        | 2214 |
                  Valor a Pagar
R$ 13.894,65

Valor Saldo R$ 13.894,65
Código <codigo> – <nome>
Pix: <pix_chave>
```

Pode agregar múltiplos lotes da mesma transportadora numa quitação só (toggle "Agrupar saldos pendentes desta transportadora").

### 6. Hooks novos
- `useTransportadorasFinanceiro` (CRUD)
- `useAdiantamentos` (lista, com filtros de status)
- `useCriarAdiantamento` (transação: cria header + insere ctes na pivot)
- `useMarcarPago`, `useRegistrarQuitacao`, `useCancelarAdiantamento`

### 7. Integração com aba CT-es existente
- Coluna nova "Adiantamento" mostrando badge: `—` / `ADT-...` (link) / `Pago` / `Quitado`.
- Bloquear delete de CT-e que já está em adiantamento `pago`/`quitado`.

### Arquivos
**Novos**
- `src/components/logistica/AdiantamentosTab.tsx`
- `src/components/logistica/MontarAdiantamentoPanel.tsx`
- `src/components/logistica/ComprovanteAdiantamentoDialog.tsx`
- `src/components/logistica/RegistrarQuitacaoDialog.tsx`
- `src/components/cadastros/TransportadorasFinanceiroTab.tsx` (ou página dedicada)
- `src/hooks/useAdiantamentos.ts`
- `src/hooks/useTransportadorasFinanceiro.ts`

**Editados**
- `src/pages/Logistica.tsx` — adiciona aba "Adiantamentos"
- `src/pages/Cadastros.tsx` — adiciona aba "Transportadoras"
- `src/components/logistica/CtesDacteTab.tsx` — coluna "Adiantamento" + bloqueio de delete

### Migrations
1. `create table transportadoras_financeiro` + RLS admin/logistica.
2. `create table adiantamentos_frete` + sequence/numeração + RLS.
3. `create table adiantamentos_frete_ctes` + UNIQUE(cte_id) parcial (status ≠ cancelado).

Sem alteração em `ctes_dacte` — vínculo é inferido pela pivot.
