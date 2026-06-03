## Diagnóstico

O upload de DACTE faz isto:

1. PDF é enviado em base64 para a edge function `parse-dacte-pdf`
2. A função manda o PDF para o Gemini 2.5 Flash extrair os CT-es
3. Gemini pode demorar 30–80s por PDF (especialmente PDFs com várias páginas / vários CT-es)
4. A função ainda tenta até **3 vezes** com esperas de **1s + 3s + 7s** quando recebe 429/5xx
5. Resultado: o tempo total estoura o limite do gateway (~150s) → **504 Gateway Timeout**

Os logs da edge function confirmam: ela inicia e morre sem retornar (só `boot` / `shutdown`, sem resposta), padrão típico de timeout.

## O que vou mudar

**1) Edge function `parse-dacte-pdf`**
- Trocar o modelo de `google/gemini-2.5-flash` para **`google/gemini-2.5-flash-lite`** — é bem mais rápido e funciona muito bem para extração estruturada de formulário como DACTE.
- Adicionar **AbortController** com timeout de 90s na chamada ao Gemini para nunca estourar o gateway silenciosamente.
- Reduzir retries: só 1 retry com 2s de espera quando o gateway retornar 429/5xx (não 504 do próprio Gemini).
- Quando der timeout, retornar HTTP **504** com mensagem clara `{ error: "timeout", message: "PDF muito grande ou IA lenta — divida o PDF e tente novamente", retryable: true }`.

**2) Diálogo `ImportarDacteDialog.tsx`**
- Tratar `status === 504` e `error === "timeout"` da mesma forma que `rate_limited`: marcar o arquivo como **"Tentar novamente"** em vez de "erro" definitivo (já tem o botão de retry).
- Reduzir a concorrência de **2 → 1** quando algum PDF tem mais de 5 MB (PDFs grandes em paralelo aumentam latência e chance de timeout).
- Avisar antes do upload se um PDF tem mais de 10 MB (sugerir dividir).

**3) Sem mudanças no fluxo de salvar**
O save (`handleSaveAll`) não está envolvido — o 504 acontece no parse. O upload para o storage e o insert continuam iguais.

## Resultado esperado

- PDFs normais (1–3 CT-es) devem voltar em 5–15s em vez de 30–60s.
- PDFs grandes que ainda assim demorarem retornam um aviso amigável e o botão "Tentar novamente" continua funcionando.
- Acaba o erro 504 silencioso.
