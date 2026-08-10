# Corrigir "Tomador não identificado" na importação de DACTE

## O problema

Na importação de CT-e, a IA está devolvendo o campo **Tomador** vazio (badge laranja "Tomador não identificado"). Como o dialog só permite salvar CT-es cujo tomador contenha "FRICO", nada é salvo — o botão salvar acusa "sem tomador" e ignora os arquivos.

No print também aparece um sintoma relacionado de leitura fraca: Valor Frete 70 igual ao Peso 70, o que indica que o modelo atual está lendo o DACTE com pouca precisão.

Confirmado no código:
- `supabase/functions/parse-dacte-pdf/index.ts` usa o modelo `google/gemini-2.5-flash-lite` e pede `tomador` como campo simples de texto, sem instruções sobre o formato real do quadro "TOMADOR DO SERVIÇO" (que normalmente traz apenas um marcador do papel: Remetente/Destinatário/Expedidor/Recebedor).
- `src/components/logistica/ImportarDacteDialog.tsx` (linhas 344-390) exige `isFrico(tomador)` para salvar, então tomador vazio = bloqueio total.

## O que será feito

### 1. Melhorar a extração do tomador (edge function)
- Trocar o modelo para `google/gemini-2.5-flash` (mais preciso em leitura de documentos) mantendo o retry atual.
- Reescrever a instrução do tomador: identificar primeiro qual papel está marcado no quadro "TOMADOR DO SERVIÇO" e depois copiar a razão social daquele quadro (remetente/destinatário/expedidor/recebedor). Se o quadro não existir, usar a razão social do remetente.
- Retornar também campos auxiliares: `tomador_papel` (remetente/destinatario/expedidor/recebedor), `tomador_cnpj`, e as razões sociais de remetente e destinatário. Assim, mesmo quando a razão social do tomador não for lida, é possível deduzi-la.
- Reforçar a regra de valor do frete vs. peso: se o valor encontrado for igual ao peso, ignorar e devolver 0.

### 2. Fallback no frontend
- Se `tomador` vier vazio, deduzir a partir de `tomador_papel` + razão social correspondente (remetente/destinatário), antes de marcar como "não identificado".
- Se o CNPJ do tomador for lido e bater com o CNPJ da Frico, tratar como Frico mesmo sem razão social.

### 3. Não travar mais o salvamento
- CT-e com tomador em branco deixa de ser bloqueado: fica marcado como "Tomador a confirmar" e pode ser salvo depois de o usuário digitar/confirmar o tomador no campo já existente.
- Continua bloqueado apenas o caso comprovadamente errado: tomador lido e claramente diferente de Frico (status "Recusado"), como hoje.
- O contador do botão salvar e as mensagens de toast passam a distinguir "recusado" de "a confirmar".

## Detalhes técnicos

- `supabase/functions/parse-dacte-pdf/index.ts`: novo `SYSTEM_PROMPT`, novos campos no schema da tool (`tomador_papel`, `tomador_cnpj`, `remetente`, `destinatario`), modelo `google/gemini-2.5-flash`.
- `src/components/logistica/ImportarDacteDialog.tsx`: tipo `Parsed` estendido; função `resolverTomador(parsed)` aplicada em `processFile`; ajuste de `handleSaveAll`, `okCount` e badges.
- Nenhuma mudança de banco de dados; `raw_extracao` continua guardando a extração completa para auditoria.
