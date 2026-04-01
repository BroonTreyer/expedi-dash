

# Corrigir Preview de Documentos (PDF e Fotos)

## Problema Raiz

O upload de documentos em `useMotoristas.ts` salva o arquivo sem extensão (`motoristas/${id}/documento`). A URL assinada resultante não contém `.pdf`, então `isPdfUrl()` nunca detecta como PDF. O `<img>` tenta renderizar um PDF e quebra, mostrando o ícone de imagem quebrada da screenshot.

## Solução

### 1. `src/hooks/useMotoristas.ts` — Preservar extensão no upload
- Mudar o path de `motoristas/${id}/documento` para `motoristas/${id}/documento.${ext}` (extraindo a extensão do arquivo original)
- Isso garante que novos uploads tenham a extensão correta na URL

### 2. `src/components/portaria/PhotoViewerDialog.tsx` — Fallback inteligente para imagens quebradas
- Adicionar `onError` no `<img>` que detecta falha de carregamento e mostra automaticamente um fallback com iframe (tentativa de PDF) + botão "Abrir em nova aba"
- Isso resolve tanto URLs antigas (sem extensão) quanto novos PDFs

### 3. `src/hooks/useRegistrosPortaria.ts` e `src/hooks/useMovimentacoesPortaria.ts` — Verificar uploads similares
- Esses já preservam a extensão (`${tipo}_${Date.now()}.${ext}`), então estão OK

| Arquivo | Mudança |
|---|---|
| `useMotoristas.ts` | Adicionar extensão ao path de upload (create e update) |
| `PhotoViewerDialog.tsx` | Adicionar estado `imgError` + fallback automático quando `<img>` falha |

