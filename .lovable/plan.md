## Objetivo
Permitir que o perfil **Portaria** (vigia) também consiga **anexar arquivo de foto** nos campos de captura, em vez de ficar restrito apenas à câmera. Hoje o botão "Enviar arquivo / Arquivo" só aparece para Admin e Logística (`canRegularizar`).

## Mudança
Arquivo: `src/components/portaria/RegistroMovimentoDialog.tsx` (linha 676)

- Trocar `allowFileUpload={canRegularizar}` por `allowFileUpload` (sempre habilitado).

Efeito:
- Em todos os campos de foto do diálogo de registro (placa, documento, painel, nota, lacre, painel saída), o usuário da portaria passa a ver:
  - Botão **"Enviar arquivo"** no estado vazio (além do "Toque para fotografar").
  - Botão **"Arquivo"** ao lado do "Refazer" depois que já há uma foto, para substituir por um arquivo da galeria/PDF.
- Continua aceitando colar (Ctrl+V) imagem.
- Não altera regras de obrigatoriedade, OCR, upload para o bucket `portaria`, nem permissões de regularização (edição posterior segue restrita a Admin/Logística via `canRegularizar` na linha 179–180).

## Fora de escopo
- Não mexer em `CapturaFoto.tsx` (já suporta `allowFileUpload`).
- Não mexer em outros lugares que usam `CapturaFoto` (ex.: `MotoristaAutocomplete` já passa `allowFileUpload`).
- Sem mudança de banco, RLS ou edge function.