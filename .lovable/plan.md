

# Corrigir scrollbar horizontal da tabela

## Problema
Existem **dois** containers com `overflow-auto`: o wrapper externo na `CarregamentoTable` (linha 261) e o wrapper interno do componente `Table` (ui/table.tsx linha 7). A barra horizontal fica presa no fundo do conteúdo total da tabela.

## Solução
1. **`src/components/dashboard/CarregamentoTable.tsx`** (linha 261):
   - Remover `max-h-[calc(100vh-320px)]` e `overflow-auto`
   - Usar apenas `overflow-x-auto overflow-y-visible` — scroll horizontal sempre acessível, sem scroll vertical
   - Manter `sticky top-0` no header para quando a página rola

2. **`src/components/ui/table.tsx`** (linha 7):
   - Remover `overflow-auto` do wrapper interno do `<Table>`, trocar para `overflow-visible` — assim o scroll horizontal é controlado apenas pelo container externo

## Resultado
- Scrollbar horizontal visível logo abaixo da área visível da tabela (sem precisar rolar até o fim)
- Sem barra de scroll vertical na tabela
- Rolagem vertical da página continua normal via scroll da página/layout

