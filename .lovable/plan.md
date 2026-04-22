

## Adicionar upload de foto por arquivo (Admin/Logística) na Portaria

### O que vai mudar

Hoje, no `RegistroMovimentoDialog`, as fotos (placa, painel, lacre, nota, documento) são capturadas **apenas pela câmera** via componente `PhotoCapture`. Para resolver casos onde a portaria esqueceu de tirar a foto na hora mas o admin/logística tem o arquivo (ex: foto que o motorista mandou por WhatsApp), vou adicionar **upload de arquivo** como alternativa — restrito a **Admin** e **Logística**.

### Como vai funcionar

1. No `PhotoCapture`, quando o usuário for **Admin ou Logística**, aparece um botão extra **"Enviar arquivo"** ao lado de "Tirar Foto".
2. O botão abre o seletor de arquivos (aceita `image/*` e `application/pdf` — mesmo padrão do sistema atual de mídia).
3. O arquivo selecionado é enviado para o **mesmo bucket `portaria`** (privado), no mesmo formato de path já usado pelo PhotoCapture (`{tipo}/{timestamp}-{random}.{ext}`).
4. A URL retornada é tratada igual à da câmera — gravada no campo correspondente (`foto_painel_url`, `foto_lacre_url`, etc.).
5. Para **Portaria comum** (perfil padrão), o botão **não aparece** — continua obrigada a tirar foto na hora pela câmera.
6. Para rastreabilidade: quando o upload for feito por arquivo (e não câmera), gravo um marcador discreto no `observacoes` do registro: `[FOTO via upload por <usuário> em <data>]` — assim a diretoria sabe que aquela foto não foi capturada na portaria em tempo real.

### Por que essa abordagem

- **Reutiliza o `PhotoCapture` existente** — não cria componente novo nem duplica lógica de upload para o bucket.
- **Mesma restrição de perfil da regularização sem foto** (Admin/Logística) — coerente com o que já implementamos. Portaria não pode mandar arquivo pra burlar a câmera.
- **Marcador no `observacoes`** — diretoria diferencia foto "ao vivo" de foto "regularizada por arquivo" sem precisar de coluna nova no banco.
- **Sem mudança de banco / migration** — só ajuste de UI + lógica de upload no componente que já existe.

### Arquivos afetados

- ✏️ `src/components/portaria/PhotoCapture.tsx` — adicionar prop `allowFileUpload?: boolean`, botão "Enviar arquivo" com `<input type="file" accept="image/*,application/pdf" hidden>`, handler que faz upload pro bucket `portaria` (mesmo path/format que a câmera) e chama `onChange(url)` igual.
- ✏️ `src/components/portaria/RegistroMovimentoDialog.tsx` — passar `allowFileUpload={isAdmin || isLogistica}` para todas as instâncias de `PhotoCapture` (placa, painel, lacre, nota, documento). Quando upload por arquivo for usado em qualquer foto, marcar uma flag local `fotoViaArquivo = true` e, no `handleSave`, prefixar `observacoes` com `[FOTO via upload por <user> em <data>]` se a flag estiver ativa.

### Pergunta única antes de implementar

Quando o admin/logística enviar foto por arquivo, você quer que apareça um **badge "Foto via upload"** nos detalhes do movimento (no `MovimentoDetailsDialog`, junto do badge "Regularizado" que já tem)? Recomendo **sim** — diretoria identifica na hora que aquela evidência não veio da câmera da portaria. Confirma?

