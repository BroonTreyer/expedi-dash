

# Substituir OCR pago por Tesseract.js (gratuito, client-side)

## Problema
O OCR atual usa a edge function `ocr-portaria` que chama o Lovable AI Gateway (Gemini Flash), que retorna erro 402 quando os créditos acabam.

## Solução
Usar **Tesseract.js** — biblioteca OCR open-source que roda 100% no navegador, sem custo de API, sem edge function.

## Mudanças

### 1. Instalar Tesseract.js
Adicionar `tesseract.js` como dependência do projeto.

### 2. `src/hooks/useRegistrosPortaria.ts` — Substituir `processarOCR`
Reescrever a função `processarOCR` para usar Tesseract.js localmente em vez de chamar a edge function:
- Recebe a URL da imagem (já pública no bucket)
- Usa `Tesseract.recognize()` com idioma `por` (português)
- Para **placa**: aplica regex para extrair padrão Mercosul (ABC1D23) ou antigo (ABC-1234)
- Para **km**: extrai apenas dígitos do texto reconhecido
- Retorna `{ texto, confianca }` no mesmo formato atual — nenhum componente consumidor precisa mudar

### 3. Edge function `ocr-portaria`
Manter o arquivo mas não será mais chamada. Sem necessidade de deletar.

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `package.json` | Adicionar `tesseract.js` |
| `src/hooks/useRegistrosPortaria.ts` | Reescrever `processarOCR` para usar Tesseract.js client-side |

## Trade-offs
- **Vantagem**: Gratuito, sem limites de requisição, funciona offline
- **Desvantagem**: Precisão inferior ao Gemini para imagens de baixa qualidade; primeiro uso pode demorar ~5s para carregar o modelo OCR

