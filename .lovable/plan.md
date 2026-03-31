

# Foto do Lacre com OCR na Saída

## Problema

Na saída de terceirizados/fornecedores, o usuário precisa tirar foto do lacre e o sistema deve ler automaticamente o número via OCR. Também precisa exibir conferente e observações.

## Solução

### 1. Migration -- adicionar coluna `foto_lacre_url`

```sql
ALTER TABLE movimentacoes_portaria ADD COLUMN foto_lacre_url text;
```

### 2. `src/lib/portaria-fields-config.ts`

- Adicionar novo campo `foto_lacre_url` no array `FIELDS` (tipo `photo`, bloco `evidencias`, label "Foto do Lacre")
- No `VISIBILITY`: oculto para todas as categorias na entrada
- No `VISIBILITY_SAIDA`: obrigatório para `carga_propria`, `terceirizado` e `fornecedor`; oculto para os demais
- Garantir que `conferente` e `observacoes` estejam como `opcional` para `terceirizado` e `fornecedor` na saída (já estão para terceirizado, ajustar fornecedor)

### 3. `src/components/portaria/RegistroMovimentoDialog.tsx`

- Adicionar `foto_lacre_url` no mapa `tipoFotoMap` (tipo "lacre")
- Adicionar estados `ocrLacreLoading`, `textoLacreLido`, `confiancaLacre`
- Quando `fieldKey === "foto_lacre_url"`, chamar OCR com tipo "km" (usa Gemini para leitura de texto genérico) ou criar novo tipo "lacre"
- Exibir `OcrResultado` abaixo da foto do lacre, preenchendo `numero_lacre` automaticamente
- Adicionar `foto_lacre_url` no `handleSave`

### 4. `src/hooks/useMovimentacoesPortaria.ts`

- Adicionar `foto_lacre_url` na interface `MovimentacaoPortaria`

### 5. Edge Function `ocr-portaria` -- suporte ao tipo "lacre"

- Adicionar handler `ocrLacreGemini` que usa Gemini para ler o número do lacre em uma foto
- Prompt especializado: "Leia o número do lacre de segurança nesta imagem"

### 6. `src/hooks/useRegistrosPortaria.ts`

- `processarOCR` já aceita tipos, basta passar "lacre" como tipo

## Detalhes Técnicos

| Arquivo | Mudança |
|---|---|
| Migration SQL | Adicionar coluna `foto_lacre_url` |
| `supabase/functions/ocr-portaria/index.ts` | Adicionar handler OCR para tipo "lacre" via Gemini |
| `src/lib/portaria-fields-config.ts` | Novo campo foto_lacre_url, ajustar visibilidade saída (conferente e obs para fornecedor) |
| `src/components/portaria/RegistroMovimentoDialog.tsx` | OCR do lacre ao tirar foto, estados de loading/resultado, salvar foto_lacre_url |
| `src/hooks/useMovimentacoesPortaria.ts` | Adicionar `foto_lacre_url` na interface |

