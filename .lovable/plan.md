

## Remover funcionalidade de transferência de categoria

### Objetivo
Remover o botão e toda a lógica de transferência entre "Carga Própria" ↔ "Terceirizado" que foi adicionada anteriormente.

### Mudanças

**1. `src/components/portaria/PatioAtualTab.tsx`**
- Remover import `ArrowRightLeft` do lucide-react (linha 8)
- Remover import `useTransferirCategoria` (linha 13)
- Remover state `transferConfirmId` (linha 68)
- Remover `transferirMov` hook call (linha 67)
- Remover função `handleTransferir` (linhas 185-189)
- Remover botão de transferência da view mobile (linhas 280-294)
- Remover botão de transferência da view desktop (linhas 407-421)

**2. `src/hooks/useMovimentacoesPortaria.ts`**
- Remover export da função `useTransferirCategoria` (linhas 193-219)

