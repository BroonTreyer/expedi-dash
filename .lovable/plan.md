## Marcar Pendentes como Pago com data + comprovante

Hoje em **Pendentes**, ao selecionar e clicar **"Marcar como pago"**, abre só um `confirm()` simples e gera com a data de hoje, sem comprovante. Vou usar o mesmo padrão visual que já existe em **Aguardando Quitação** (o `ComprovanteAdiantamentoDialog`, que já mostra o texto formatado pra WhatsApp e tem campo de data) e acrescentar **upload do comprovante (PDF/imagem)**.

### Mudanças

1. **Botão "Marcar como pago" em Pendentes** (`AdiantamentosTab.tsx`)
   - Em vez de chamar `confirm()` + `marcarPago.mutateAsync` direto, **abre o `ComprovanteAdiantamentoDialog`** já existente com os ADTs pendentes selecionados.
   - Remove `handleMarcarPagoLote` (não é mais necessário).

2. **`ComprovanteAdiantamentoDialog.tsx`**: adicionar input opcional **"Anexar comprovante"** (PDF/JPG/PNG, ≤ 5 MB).
   - Aparece junto com o campo "Data do pagamento" (quando há pendentes).
   - Ao clicar "Marcar como pagos": faz upload para o bucket `dacte` em `comprovantes-adt/<adt_id>/<timestamp>-<arquivo>` (uso o bucket já existente, sem nova migração) e grava a URL em `comprovante_pagamento_url` junto do `pago_em`.
   - Se nenhum arquivo for anexado, marca como pago igual hoje (comprovante fica opcional).

3. **`useMarcarAdiantamentoPago`** (`useAdiantamentos.ts`)
   - Aceitar campo opcional `comprovante_pagamento_url`. Quando vier, é incluído no UPDATE.

### Detalhes técnicos
- **Bucket de storage:** reaproveito `dacte` (privado) com prefixo `comprovantes-adt/`. Sem nova bucket nem migração de policy.
- **URL salva:** uso `getPublicUrl` (mesmo para bucket privado, a URL fica armazenada; pra abrir depois geramos `createSignedUrl`). Isso segue o padrão já usado para CT-es no projeto.
- **Sem alterar** o fluxo de "Aguardando Quitação" — só o ponto de entrada em "Pendentes".

### Resultado
Selecionar pendentes → clicar "Marcar como pago" → abre diálogo com texto pré-formatado, escolhe data, opcionalmente anexa comprovante, confirma. Estado vai para "Aguardando Quitação" com o comprovante já vinculado.
