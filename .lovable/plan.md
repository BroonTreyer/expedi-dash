
Objetivo: corrigir definitivamente a impressão/PDF do romaneio para sempre exibir o conteúdo e manter layout estável.

1) Auditoria (causa raiz encontrada)
- O CSS de impressão atual está amplo demais e pode esconder o próprio conteúdo do dialog:
  - Regra crítica: `[data-radix-portal] > [data-state] { display: none !important; }`
  - Em Radix, o conteúdo pode compartilhar `data-state`, então essa regra pode “sumir” com o documento.
- `CargaPrintDialog` está sem `DialogTitle` e `DialogDescription`, gerando erros de acessibilidade no console (confirmado nos logs).
- A estratégia atual depende demais da estrutura interna do portal (frágil para mudanças de DOM/versão).

2) Estratégia de correção (robusta)
- Escopar impressão apenas quando o usuário clicar em “Imprimir / PDF”:
  - adicionar classe temporária no `body` (ex.: `printing-carga`) antes de `window.print()`
  - remover no `afterprint` (com fallback por timeout)
- Parar de usar seletor genérico que esconde elementos por `data-state`.
- Mirar explicitamente o dialog do romaneio com classe/atributo dedicado (ex.: `data-print-dialog="carga"`), mantendo só esse conteúdo visível na impressão.
- Manter overlay/backdrop sempre oculto na impressão, sem arriscar esconder o conteúdo.

3) Ajustes de estrutura no componente de impressão
Arquivo: `src/components/dashboard/CargaPrintDialog.tsx`
- Adicionar `DialogHeader` com:
  - `DialogTitle` (pode estar `sr-only`)
  - `DialogDescription` (pode estar `sr-only`)
- Marcar o `DialogContent` com identificador exclusivo de impressão (`data-print-dialog="carga"`).
- Atualizar `handlePrint` para controlar `body.printing-carga` + cleanup confiável.
- Preservar `#carga-print-content` como conteúdo único do documento.

4) Ajustes de CSS de impressão
Arquivo: `src/index.css`
- Reescrever `@media print` para usar escopo `body.printing-carga`.
- Remover regra perigosa que oculta por `[data-state]`.
- Garantir:
  - A4 portrait + margens
  - reset de transform/fixed apenas no dialog de impressão
  - ocultar botões e close icon no print
  - tipografia e contraste consistentes
  - `break-inside: avoid` para blocos de cliente (evitar cortes feios entre páginas)

5) Validação pós-correção
- Fluxo 1: fechar carga → abrir romaneio → imprimir/PDF (conteúdo completo)
- Fluxo 2: reimprimir carga já fechada (via botão da tabela)
- Verificar:
  - sem página em branco
  - sem conteúdo truncado
  - sem erros de `DialogTitle/DialogDescription` no console
  - ordem, totais e blocos por cliente corretos no PDF
