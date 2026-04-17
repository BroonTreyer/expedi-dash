
User quer adicionar **captura de foto do motorista** (selfie/rosto) ao cadastro, mantendo a foto do documento que já existe. Hoje o cadastro tem apenas `foto_documento_url`.

## Plano

### 1. Banco — adicionar coluna
Migration na tabela `motoristas`:
- `foto_motorista_url text` (nullable)

### 2. Hook `src/hooks/useMotoristas.ts`
- Adicionar `foto_motorista_url` na interface `Motorista`.
- `useCreateMotorista` e `useUpdateMotorista`: aceitar `fotoMotoristaFile?: File` (além do `fotoFile` que é o documento).
  - Upload no bucket `portaria` em `motoristas/{id}/rosto.{ext}`.
  - Gera signed URL (1 ano) e grava em `foto_motorista_url`.

### 3. Página `src/pages/Cadastros.tsx`
No card de cadastro do motorista, adicionar um segundo `<CapturaFoto>`:
- **Foto do Motorista** (selfie/rosto) — usa câmera frontal idealmente, mas mantém componente atual (rear) por consistência. Aceita imagem.
- **Foto do Documento** — já existe.

Layout: lado a lado em `grid grid-cols-1 sm:grid-cols-2 gap-3` para manter compacto no desktop e empilhar no mobile.

Estado novo: `fotoMotoristaFile`. Passar para `mutateAsync({ ..., fotoMotoristaFile })`.

### 4. Busca/Consulta (`?focus=buscar`)
Mostrar miniatura da foto do motorista ao lado do nome no resultado (avatar 8×8 com fallback de iniciais), e botão "Ver foto" abrindo o `PhotoViewerDialog`.

### Arquivos alterados
- ✏️ migration SQL (nova coluna `foto_motorista_url`)
- ✏️ `src/hooks/useMotoristas.ts` (interface + create/update)
- ✏️ `src/pages/Cadastros.tsx` (campo de captura + preview na busca)

### Sem mudanças em
- RLS, bucket (já existe `portaria` privado), permissões, rotas.
