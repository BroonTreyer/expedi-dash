## Auditoria

**O pedido NÃO sumiu** — ele foi anexado à carga `CG-20260612-152632-L9J` (3 linhas, cliente 23592 DVA ATACADOS 40, pedido nº 1, ordem_entrega 1/2/3, etapa=logistica). Auditoria às 18:39 UTC confirma o `UPDATE` bem-sucedido.

**O motivo de você não enxergar:** o pedido foi criado com `data = 2026-06-09` (lançado no dia 09/06 pelo Faturamento). A carga de destino é do dia `2026-06-12`. Como o Dashboard filtra por data, o pedido fica "escondido" no dia 09/06, fora da carga visível em 12/06.

```
carga CG-20260612-152632-L9J:
  data=2026-06-12  →  3 itens (cliente 32916)   ← aparece
  data=2026-06-09  →  3 itens (cliente 23592)   ← não aparece no dia 12
```

**Causa raiz no código** — `src/components/dashboard/AdicionarCargaDialog.tsx` (linhas 62-82): ao anexar a uma carga já fechada (`etapa=logistica`), o update só sincroniza `placa`, `motorista`, `tipo_caminhao`, `horario_previsto`, `etapa`, `ordem_entrega`. Não propaga `data`, `nome_carga`, `transportadora` nem `ordem_carga` da carga alvo (isso só acontece se for pré-carga). Resultado: os pedidos ficam tecnicamente vinculados mas com `data` do pedido original, sumindo do dia em que a carga foi fechada.

## Plano

### 1. Correção do bug (`AdicionarCargaDialog.tsx`)

Remover o `if (isPre)` em torno dos campos sincronizados. Sempre propagar do carga alvo para o pedido anexado:

- `data` ← `carga.data`
- `nome_carga` ← `carga.nomeCarga`
- `transportadora` ← `carga.transportadora`
- `ordem_carga` ← `carga.ordemCarga`

Isso garante que pedido anexado migre para o dia da carga e apareça junto dos demais itens, tanto para pré-carga quanto para carga fechada.

### 2. Reparo dos dados existentes

Atualizar as 3 linhas afetadas (ids `ce18969a...`, `9315f7a0...`, `711fc7f1...`) setando `data = 2026-06-12` para alinhá-las ao restante da carga `CG-20260612-152632-L9J`. Assim os pedidos do cliente 23592 voltam a aparecer no Dashboard do dia 12/06 dentro da carga correta.

### 3. Validação

- Abrir Dashboard em 12/06 e confirmar que a carga `CG-20260612-152632-L9J` mostra 6 itens (3 do cliente 32916 + 3 do cliente 23592 DVA).
- Anexar outro pedido de teste a uma carga fechada e confirmar que ele aparece no dia da carga, não no dia original do pedido.

## Detalhes técnicos

- A mutation `batchUpdateMut` já aceita os campos `data`, `nome_carga`, `transportadora`, `ordem_carga` — não precisa mudar hook nem schema.
- A trigger `audit_carregamentos` já loga mudanças em `data`/`nome_carga` automaticamente.
- Nenhuma mudança de RLS ou migration.
