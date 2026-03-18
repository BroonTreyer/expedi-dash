

# Ajustes no Formulário e Detalhes da Portaria

## Problemas identificados
1. **OCR no painel KM**: Atualmente o sistema tenta OCR na foto do painel — o conferente prefere tirar a foto e digitar o KM manualmente
2. **Lacre não aparece nos detalhes**: O campo existe no código (linha 190), mas precisa verificar se está sendo salvo corretamente
3. **Nome duplicado**: "Conferente" aparece tanto na seção "Info Básica" (linha 187) quanto na seção "Controle" (linha 248) — informação redundante

## Mudanças

### 1. `RegistroMovimentoDialog.tsx` — Remover OCR do painel KM
- Remover o bloco de OCR para `foto_painel_url` (linhas 110-124)
- Remover states `ocrPainelLoading`, `textoPainelLido`, `confiancaPainel`
- Remover o bloco de `OcrResultado` para `foto_painel_url` (linhas 308-319)
- Manter a foto como evidência, mas sem processamento OCR

### 2. `MovimentoDetailsDialog.tsx` — Remover duplicações
- Remover `Conferente` da seção "Info Básica" (linha 187) — manter apenas na seção "Controle"
- OU remover da seção "Controle" e manter só na básica — escolher um lugar só
- Garantir que `numero_lacre` está visível (já está no código, verificar se o dado está chegando)
- Renomear "Conferente (Saída)" para "Conferente (Retorno)" na seção Controle (linha 249)

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Remover OCR do painel KM (states + handler + UI) |
| `src/components/portaria/MovimentoDetailsDialog.tsx` | Remover conferente duplicado, renomear "Saída" → "Retorno" nos labels restantes |

