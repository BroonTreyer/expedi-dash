

# Migrar OCR de Placas: Tesseract.js → IA com Visão (Gemini)

## Problema

O OCR atual usa **Tesseract.js** no client-side. Tesseract é um OCR genérico de texto — péssimo para placas veiculares em fotos reais (ângulo, reflexo, sujeira, resolução variável). Resultado: leituras imprecisas e confiança baixa.

## Solução

Substituir o Tesseract.js pela **edge function `ocr-portaria`** que já existe no projeto e usa o modelo **Gemini 2.5 Flash** via Lovable AI Gateway. Essa função já está pronta e faz exatamente isso — recebe a URL da imagem, envia para o modelo de visão, e retorna texto + confiança. Porém ela **nunca é chamada** — o código client-side ainda usa Tesseract diretamente.

## O que muda

### 1. `src/hooks/useRegistrosPortaria.ts` — Trocar implementação do `processarOCR`

Remover o import do Tesseract.js e substituir pela chamada à edge function:

```typescript
export async function processarOCR(imageUrl: string, tipo: "placa" | "km") {
  const { data, error } = await supabase.functions.invoke("ocr-portaria", {
    body: { imageUrl, tipo },
  });
  if (error) throw error;
  return { texto: data.texto, confianca: data.confianca };
}
```

### 2. Nenhum outro arquivo muda

Todos os componentes (`RegistroMovimentoDialog`, `RegistroPortariaDialog`) já chamam `processarOCR` — a interface (entrada/saída) permanece idêntica. A troca é transparente.

## Resultado esperado

- Leitura de placas com modelo de visão treinado (Gemini) em vez de OCR genérico
- Reconhecimento muito superior para placas Mercosul e formato antigo
- Sem dependência do Tesseract.js (pacote pesado, ~15MB de WASM)

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/hooks/useRegistrosPortaria.ts` | Substituir `processarOCR` de Tesseract.js para `supabase.functions.invoke("ocr-portaria")` |

