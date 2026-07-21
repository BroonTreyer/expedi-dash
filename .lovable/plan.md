## Objetivo
Permitir desfazer etapas dos adiantamentos (Quitado → Pago → Pendente) e editar dados-chave, com confirmação e rastreabilidade — sem alterar o fluxo "para frente" já existente.

## Fluxo reverso proposto

```text
Pendente  ⇄  Pago  ⇄  Quitado
   ↑                    │
   └──── Cancelado ─────┘  (cancelamento continua como hoje; reabrir opcional)
```

- **Desmarcar Quitado** → volta para `pago`; limpa `quitado_em` / `quitado_por` / `observacoes_quitacao`; mantém `pago_em` e comprovante.
- **Desmarcar Pago** → volta para `pendente`; limpa `pago_em` / `pago_por` / `comprovante_pagamento_url` (com aviso: o comprovante anexado é removido do registro).
- **Reabrir Cancelado** (opcional, só admin) → volta para `pendente`.

Regras:
- Só habilita "Desmarcar quitado" se `status = 'quitado'`; só habilita "Desmarcar pago" se `status = 'pago'`.
- Confirmação obrigatória (AlertDialog) explicando o que será revertido.
- Toast de sucesso/erro e invalidação das queries de adiantamentos.

## Ações de edição no menu do adiantamento
Um menu "⋯ Ações" por linha (na tabela de adiantamentos), reunindo o que já existe + o novo:
- Ver comprovante
- Editar data do adiantamento (já existe, apenas movido para o menu)
- Editar data de pagamento (novo — quando `pago`/`quitado`)
- Editar data de quitação (novo — quando `quitado`)
- Editar observações de quitação (novo — quando `quitado`)
- Desmarcar quitado / Desmarcar pago / Reabrir cancelado (conforme status)
- Cancelar adiantamento (já existe)

## Onde aparece
- Tabela principal de adiantamentos em `AdiantamentosTab.tsx` — nova coluna "Ações" com `DropdownMenu`.
- Também no `ComprovanteAdiantamentoDialog` (rodapé) quando estiver aberto em um `quitado`/`pago`, para agilizar reversão a partir do comprovante.

## Detalhes técnicos
Arquivos:
- `src/hooks/useAdiantamentos.ts` — novos hooks:
  - `useDesmarcarQuitado(ids: string[])` → update `status='pago'`, zera campos de quitação.
  - `useDesmarcarPago(ids: string[])` → update `status='pendente'`, zera campos de pagamento (+ comprovante).
  - `useReabrirCancelado(id)` → update `status='pendente'`.
  - `useAtualizarDataPagamento`, `useAtualizarDataQuitacao`, `useAtualizarObservacoesQuitacao`.
  - Todos usam `log_audit('adiantamento', id, 'reverter_<etapa>' | 'editar_<campo>', { de, para })`.
- `src/components/logistica/AdiantamentosTab.tsx` — nova coluna Ações + AlertDialogs de confirmação.
- `src/components/logistica/ComprovanteAdiantamentoDialog.tsx` — botões "Desmarcar quitado/pago" no rodapé conforme status.

Sem migration: usa colunas existentes (`status`, `pago_em`, `quitado_em`, `comprovante_pagamento_url`, `observacoes_quitacao`).

## Fora de escopo
- Não altera lógica de criação, rateio de peso, quitação em lote nem cancelamento.
- Não mexe em CT-es vinculados (permanecem intactos ao reverter status).
