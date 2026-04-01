

# Aceitar PDF no Upload de Documento do Motorista

## Problema
O componente `CapturaFoto` aceita apenas `image/*`. Para documentos de motorista, PDFs também são válidos.

## Mudanças

### 1. `src/components/portaria/CapturaFoto.tsx`
- Adicionar prop opcional `accept` com default `"image/*"`
- Quando o arquivo for PDF, mostrar um preview genérico (ícone de PDF) em vez de `<img>`
- Ajustar a lógica de preview para detectar tipo de arquivo

### 2. `src/pages/Motoristas.tsx`
- Passar `accept="image/*,.pdf,application/pdf"` no `CapturaFoto` do documento do motorista

### 3. `src/hooks/useMotoristas.ts`
- Nenhuma mudança necessária — o upload para storage já aceita qualquer tipo de arquivo

## Detalhes Tecnicos

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/CapturaFoto.tsx` | Nova prop `accept?: string`, detectar PDF no preview e mostrar ícone em vez de imagem |
| `src/pages/Motoristas.tsx` | Passar `accept="image/*,.pdf,application/pdf"` |

