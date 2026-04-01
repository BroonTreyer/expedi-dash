

# Preview de PDFs e Fotos Upados

## Problema
Atualmente, quando um PDF é enviado, o `PhotoViewerDialog` tenta renderizá-lo como `<img>`, o que não funciona para PDFs. O `CapturaFoto` já detecta PDFs e mostra um ícone, mas ao clicar para ampliar, não há preview real do conteúdo.

## Solução

### 1. `src/components/portaria/PhotoViewerDialog.tsx`
- Detectar se a URL é de um PDF (`.pdf` ou `application/pdf` na URL)
- Para PDFs: renderizar um `<iframe>` apontando para a URL com fallback para link de download
- Para imagens: manter o `<img>` atual
- Adicionar botão "Abrir em nova aba" para ambos os tipos

### 2. `src/components/portaria/CapturaFoto.tsx`
- Ao clicar no preview de PDF (ícone FileText), abrir o `PhotoViewerDialog` para preview real
- Adicionar estado para controlar o viewer

### 3. `src/components/portaria/MovimentoDetailsDialog.tsx` — `ClickablePhoto`
- Detectar URLs de PDF e renderizar ícone clicável em vez de `<img>` quebrada
- O clique abre o `PhotoViewerDialog` que agora suporta PDFs

## Detalhes Técnicos

| Arquivo | Mudança |
|---|---|
| `PhotoViewerDialog.tsx` | Detectar PDF na URL → renderizar `<iframe>` em vez de `<img>`. Adicionar botão "Abrir em nova aba" |
| `CapturaFoto.tsx` | Integrar `PhotoViewerDialog` para preview ao clicar no thumbnail |
| `MovimentoDetailsDialog.tsx` | `ClickablePhoto` detecta PDF e mostra ícone em vez de img quebrada |

