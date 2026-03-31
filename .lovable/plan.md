

# Remover Bloco Vermelho do Painel de Veículos Esperados

## Problema

O `VeiculosEsperadosPanel` usa um `Card` com classes `border-primary/20 bg-primary/5`, que cria um grande bloco avermelhado ao redor de toda a tabela na aba Esperados. Isso polui visualmente a página.

## Solução

Remover o fundo e borda coloridos do Card, deixando-o neutro (como o resto da página), ou remover o Card wrapper completamente já que o conteúdo está dentro de uma aba dedicada.

### Mudança em `VeiculosEsperadosPanel.tsx`

- Trocar `border-primary/20 bg-primary/5` por classes neutras (sem fundo colorido, borda padrão)
- O header e a tabela continuam iguais, só perde o "container vermelho"

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/VeiculosEsperadosPanel.tsx` | Remover `border-primary/20 bg-primary/5` do Card |

