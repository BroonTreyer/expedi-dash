

## Bug: Foto do lacre não aparece em Detalhes

### Causa
Em `src/components/portaria/MovimentoDetailsDialog.tsx` (linhas 127-135), o array `allPhotos` inclui placa, documento, painel e nota — mas **omite `foto_lacre_url`**. Como o lacre é o único anexo do fluxo de saída (Carga Própria) e do fluxo Terceirizado/Fornecedor, a foto fica invisível.

### Correção

**Arquivo:** `src/components/portaria/MovimentoDetailsDialog.tsx`

Adicionar duas linhas no bloco `allPhotos` (após as linhas existentes de painel/nota):

```ts
if (m.foto_lacre_url) allPhotos.push({ url: m.foto_lacre_url, alt: "Lacre", label: "🔒 Foto do Lacre (Entrada)" });
// ...
if (s?.foto_lacre_url) allPhotos.push({ url: s.foto_lacre_url, alt: "Lacre", label: "🔒 Foto do Lacre (Saída)" });
```

Como o lacre normalmente é capturado na **saída** (etapa "lacre" da Carga Própria) ou no único movimento (Terceirizado/Fornecedor), a foto vai aparecer corretamente seja qual for o registro (`m` ou `s`).

### Arquivos
- ✏️ `src/components/portaria/MovimentoDetailsDialog.tsx` — incluir `foto_lacre_url` de `m` e `s` no array `allPhotos`

