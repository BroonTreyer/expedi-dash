

## Corrigir warnings de `forwardRef` na página Rupturas

### Problema

Dois warnings recorrentes no console quando a página `/rupturas` carrega:

1. `Rupturas.tsx:264` — `<Tooltip>` recebe como filho um function component que não encaminha `ref`. O Radix Tooltip exige que o trigger aceite `ref` para posicionar/medir o popup.
2. `RupturasPrintDialog.tsx` — `<Dialog>` ou `DialogTrigger` envolve um function component sem `forwardRef`.

Não quebra a tela, mas:
- Polui o console (atrapalha debug).
- Tooltips podem piscar/posicionar errado em hover.
- Acessibilidade (foco) fica inconsistente.

### Mudança

**Arquivo 1 — `src/pages/Rupturas.tsx`:**
- Localizar o `<Tooltip>` próximo à linha 264 (dentro de uma `<td>` da tabela de rupturas) e identificar o componente filho que está sendo usado como `TooltipTrigger`.
- Envolver esse componente filho com `React.forwardRef<HTMLElement, Props>(...)`, encaminhando `ref` para o elemento DOM raiz (geralmente um `<button>`, `<span>` ou `<div>`).
- Alternativa mais simples se for um wrapper trivial: usar `<TooltipTrigger asChild>` apontando direto para o elemento DOM nativo, eliminando o componente intermediário.

**Arquivo 2 — `src/components/dashboard/RupturasPrintDialog.tsx`:**
- Localizar o ponto onde um function component é passado como filho de `<Dialog>` / `<DialogTrigger>`.
- Mesmo padrão: ou converter o componente para `forwardRef`, ou usar `<DialogTrigger asChild>` com elemento DOM nativo direto.

### Como verificar

- Após a edição, recarregar `/rupturas`, abrir DevTools → Console: os dois warnings devem sumir.
- Hover nos badges/botões com tooltip e abertura do dialog de impressão devem continuar funcionando normalmente.

### Fora do escopo

- Outros warnings de `forwardRef` em páginas diferentes (não reportados).
- Refatoração geral da Rupturas.

### Resultado

Console limpo na rota `/rupturas`, tooltips e dialog de impressão com posicionamento e foco corretos.

