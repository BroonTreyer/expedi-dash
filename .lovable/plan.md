## Objetivo

Permitir que usuários com perfil **Portaria** subam fotos a partir de arquivos do dispositivo (galeria/PDF) ao cadastrar motoristas — não apenas tirar foto na hora pela câmera. Hoje só Admin/Logística têm essa opção; Portaria fica travada na captura ao vivo.

## Diagnóstico

- O componente `CapturaFoto` (`src/components/portaria/CapturaFoto.tsx`) força `capture="environment"` por padrão, abrindo só a câmera. O botão "Enviar arquivo" só aparece quando recebe `allowFileUpload={true}`.
- Em `RegistroMovimentoDialog.tsx` esse flag é controlado por `canRegularizar = role === "admin" || role === "logistica"` — exclui Portaria de propósito (regularização de cargas próprias).
- Nos pontos de **cadastro de motorista** o flag nem é passado:
  - `src/pages/Motoristas.tsx` (formulário completo)
  - `src/components/portaria/MotoristaAutocomplete.tsx` (cadastro rápido usado dentro dos diálogos da Portaria)
- A RLS já permite `INSERT/UPDATE` em `motoristas` e upload no bucket `portaria` para o perfil Portaria — então só falta liberar a UI.

## Mudanças

1. **`src/pages/Motoristas.tsx`**
   - Passar `allowFileUpload` para o `CapturaFoto` da "Foto do Documento" para qualquer usuário com permissão de cadastro (admin, logística, portaria). Como essa página já é restrita por rota a esses perfis, basta `allowFileUpload`.

2. **`src/components/portaria/MotoristaAutocomplete.tsx`** (cadastro rápido)
   - Passar `allowFileUpload` no `CapturaFoto` para que portaria também consiga anexar foto/PDF do documento ao criar motorista no fluxo da guarita.

3. **`src/components/portaria/RegistroMovimentoDialog.tsx`** — manter a regra atual (`canRegularizar`) intocada para fotos de movimentação, já que o pedido é específico para "cadastro de motorista e etc.". Se desejar estender para fotos de placa/KM/lacre da própria movimentação, eu separo num passo seguinte.

## Detalhes técnicos

```tsx
// Motoristas.tsx
<CapturaFoto
  label="Foto do Documento"
  onCapture={(f) => setFotoFile(f)}
  previewUrl={motorista?.foto_documento_url}
  accept="image/*,.pdf,application/pdf"
  allowFileUpload
/>

// MotoristaAutocomplete.tsx
<CapturaFoto label="Foto do Documento" onCapture={(f) => setFotoFile(f)} allowFileUpload />
```

Sem migrações, sem mudança de RLS, sem novo schema.

## Pergunta de escopo

Quer que eu também libere upload de arquivo para Portaria nas fotos de **movimentação** (placa, KM, lacre, nota) dentro do `RegistroMovimentoDialog`? Hoje só admin/logística podem subir arquivo lá — Portaria continua tendo que usar a câmera ao vivo. Se sim, eu removo a restrição `canRegularizar` apenas dessa flag (mantendo as demais regras de regularização).