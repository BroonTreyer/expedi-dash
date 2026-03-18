

# Restaurar Foto do Painel + OCR inteligente para Placa e KM

## Mudanças

### 1. Visibilidade (`portaria-fields-config.ts`)

- **Restaurar `foto_painel_url`** para `carga_propria`: de `"oculto"` → `"obrigatorio"`
- **Tornar todas as fotos obrigatórias** onde atualmente são `"opcional"`:
  - `foto_placa_url`: fornecedor, prestador, outros → `"obrigatorio"`
  - `foto_documento_url`: todas as categorias onde aparece → `"obrigatorio"`
  - `foto_nota_url`: fornecedor → `"obrigatorio"`

### 2. OCR inteligente para foto do painel KM (`RegistroMovimentoDialog.tsx`)

Expandir o `handleFotoCapture` para que, ao capturar `foto_painel_url`, execute OCR com `tipo: "km"` e preencha automaticamente o campo de KM do painel. Isso requer:

- Adicionar estados para OCR do painel (`ocrPainelLoading`, `textoPainelLido`, `confiancaPainel`)
- No `handleFotoCapture`, quando `fieldKey === "foto_painel_url"`, chamar `processarOCR(url, "km")` e preencher `km_inicial` (ou exibir o resultado para confirmação)
- Exibir o componente `OcrResultado` abaixo da foto do painel, similar ao que já existe para a placa

O OCR já funciona para ambos os tipos ("placa" e "km") na edge function `ocr-portaria` — basta usar.

### 3. Exibir resultado OCR para ambas as fotos

- **Foto da placa**: já funciona — lê a placa e preenche o campo `placa` (manter)
- **Foto do painel**: novo — lê o KM e exibe resultado com `OcrResultado` para confirmação manual

### 4. Nenhuma migração de banco necessária

Os campos `foto_painel_url` e `km_inicial`/`km_final` já existem na tabela.

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/portaria-fields-config.ts` | Atualizar visibilidade: restaurar foto_painel para carga_propria, tornar fotos obrigatórias |
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Adicionar OCR do painel KM no handleFotoCapture + exibir OcrResultado |

