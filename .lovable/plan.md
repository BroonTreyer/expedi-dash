
User quer que ambas as capturas de foto do motorista (documento e rosto) sejam **somente câmera traseira**, sem opção de upload de arquivo nem colar.

Olhando `CapturaFoto.tsx`: já existe a prop `cameraOnly` (default `true`) que aplica `capture="environment"` (câmera traseira) e oculta o paste. Em `Cadastros.tsx`, provavelmente os `<CapturaFoto>` foram criados sem essa prop ou com `cameraOnly={false}`. Vou verificar e garantir.

## Plano

### `src/pages/Cadastros.tsx`
Nos dois `<CapturaFoto>` do formulário (Foto do Documento e Foto do Motorista):
- Garantir `cameraOnly={true}` (default já é true, então basta não passar `false`).
- Garantir `accept="image/*"` (sem PDF), para que `shouldCapture` seja `true` e o `capture="environment"` seja aplicado → abre direto a câmera traseira no mobile, sem galeria/arquivos.
- Remover qualquer `accept` que inclua `application/pdf` se houver.

### Sem mudanças em
- `CapturaFoto.tsx` (já suporta o modo correto).
- Hook, banco, RLS.

### Resultado
Ambas as fotos abrem direto a câmera traseira do dispositivo, sem opção de selecionar arquivo da galeria nem colar imagem.
