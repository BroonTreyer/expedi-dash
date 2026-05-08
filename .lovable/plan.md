## Diagnóstico
Hoje, ao clicar no ícone "Ver PDF" do CT-e, o app chama `supabase.storage.from("dacte").createSignedUrl(path, 3600)` e abre o resultado com `window.open(url, "_blank")`.

Problemas:
1. Não há tratamento de erro — se o `createSignedUrl` falhar (RLS, path com espaços, expiração), o `window.open` ainda é chamado com `undefined`/URL ruim, abrindo uma aba em branco ou com a página de erro do Supabase Storage.
2. Bloqueador de pop-up pode interceptar.
3. Sem feedback visual: o usuário fica olhando uma aba "com erro" sem saber por quê.

A solução padrão do projeto para PDFs/fotos é o `PhotoViewerDialog` (já usado na Portaria), que renderiza dentro de um `<iframe>` no próprio app, com fallback para "Abrir em nova aba".

## Plano

### 1. `src/components/logistica/CtesDacteTab.tsx`
- Importar `PhotoViewerDialog`.
- Adicionar estados `viewerOpen` e `viewerUrl`.
- Reescrever `openPdf(path)`:
  - Se `path` vazio → `toast.error("PDF não disponível")`.
  - Chamar `createSignedUrl(path, 3600)` e checar `error` / `data?.signedUrl`.
  - Em sucesso → `setViewerUrl(url); setViewerOpen(true)`.
  - Em falha → `toast.error("Não foi possível abrir o PDF")` e logar `error.message`.
- Renderizar `<PhotoViewerDialog open={viewerOpen} onOpenChange={setViewerOpen} url={viewerUrl} alt="DACTE" />` ao final do componente.

### 2. `src/components/logistica/ImportarDacteDialog.tsx` (preventivo, melhora futuras importações)
- Sanitizar o `path` ao subir o PDF: remover caracteres problemáticos do nome (`replace(/[^\w.\-]+/g, "_")`) para evitar ambiguidade com espaços/acentos. Continua único pelo `fileId`.

## Fora de escopo
- Sem mudança de RLS, bucket ou estrutura de pastas existente — arquivos antigos seguem acessíveis via signed URL como hoje (path com espaços é codificado pelo SDK).
- Sem download massivo ou pré-visualização inline na lista.
