# Plano: corrigir preview preso em versão antiga

Pelo print, o preview ainda está sendo servido por um estado antigo/cachê. O ajuste anterior reduziu o problema, mas ainda existe risco porque o app continua importando o registrador de PWA e o plugin ainda gera manifest/service worker. Para o ambiente Lovable, a correção mais segura é separar totalmente preview/editor de PWA.

## O que será feito

### 1. Remover registro do PWA dentro do app
- Remover `PwaUpdatePrompt` do `App.tsx`.
- Parar de importar `virtual:pwa-register/react` no bundle principal.
- Isso evita que qualquer código de service worker rode no preview/editor.

### 2. Transformar `PwaUpdatePrompt` em componente inofensivo ou removê-lo
- Se não for usado em nenhum lugar, deixar de renderizar.
- Se for mantido, ele não deve chamar `useRegisterSW` no preview.

### 3. Desativar geração do Service Worker em desenvolvimento/preview
- Ajustar `vite.config.ts` para manter o manifest/ícones se necessário, mas impedir registro/injeção automática.
- Se necessário, remover `VitePWA` temporariamente para garantir que o preview não receba nenhum artefato de service worker.

### 4. Adicionar “limpador” direto no `main.tsx`
- Manter uma limpeza explícita no carregamento do preview:
  - desregistrar service workers existentes;
  - apagar caches antigos;
  - recarregar uma única vez se havia SW/cachê controlando a aba.
- Esse código fica antes do React renderizar, para limpar o preview o mais cedo possível.

### 5. Preservar comportamento do app publicado
- No publicado (`fricotrack.com.br` e `expedi-dash.lovable.app`), se quisermos manter PWA instalável, podemos manter apenas o manifest.
- Se offline/update automático não for essencial, a opção mais estável é remover o service worker completamente e deixar só instalação via manifest.

## Resultado esperado

- O preview deixa de abrir versão antiga ao ficar parado.
- A tela branca por cache/chunk antigo deve parar de ocorrer.
- Você não precisará mandar mensagem no chat para “forçar” atualização do preview.
- O app publicado continua funcionando normalmente; se removido o SW, apenas perde cache/offline automático, mas ganha estabilidade.

## Arquivos envolvidos

- `src/App.tsx`
- `src/main.tsx`
- `src/components/PwaUpdatePrompt.tsx`
- `vite.config.ts`

## Observação

Depois da correção, pode ser necessário um último refresh forte no preview atual, porque service workers já instalados ficam presos no navegador até serem desregistrados. A partir daí, o preview não deve registrar novos service workers.