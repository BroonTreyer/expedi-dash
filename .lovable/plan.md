## Problema

No painel **Aguardando vínculo da Logística** (mobile, 390px), os 3 botões (`Editar`, `Vincular a carga`, `Recusar`) estão num `flex gap-2` sem `flex-wrap`. Como "Vincular a carga" é largo, o "Recusar" estoura a largura do card e fica visualmente fora do bloco.

Arquivo: `src/components/portaria/SolicitacoesPendentesPanel.tsx` (linhas 263–310)

## Solução (apenas UI)

1. Trocar `flex gap-2` por `flex flex-wrap gap-1.5 w-full sm:w-auto` no container dos botões.
2. Trocar o wrapper externo `flex flex-col gap-1.5 shrink-0 sm:items-end` por `flex flex-col gap-1.5 w-full sm:w-auto sm:shrink-0 sm:items-end` para o bloco ocupar a largura no mobile.
3. Adicionar `flex-1 sm:flex-none` em cada um dos 3 botões (`Editar`, `Vincular a carga`, `Recusar`) para que dividam a linha proporcionalmente no mobile e voltem ao tamanho natural no desktop.
4. Encurtar rótulo "Vincular a carga" → "Vincular" no mobile via `<span className="sm:hidden">Vincular</span><span className="hidden sm:inline">Vincular a carga</span>` para reduzir ainda mais a pressão de largura.

## Resultado esperado

Mobile (390px): os 3 botões cabem na linha, todos dentro da borda do card, sem overflow. Desktop: layout mantém o tamanho natural à direita, igual hoje.

Nenhuma mudança de lógica, hooks ou banco.
