

# Ocultar Veículos Conferidos da Lista de Esperados

## Problema

Quando o usuário registra entrada de um veículo esperado, o sistema marca como `conferido` mas continua mostrando o veículo na lista (com opacidade reduzida). O usuário quer que ele desapareça.

## Solução

**`src/components/portaria/VeiculosEsperadosPanel.tsx`**: Filtrar os veículos conferidos antes de renderizar. Mostrar apenas veículos pendentes na lista principal, e atualizar os contadores para refletir isso.

- Após o filtro de busca, adicionar `.filter(v => !v.conferido)` para excluir conferidos
- Manter o badge "X/Y conferidos" usando a lista completa para referência
- Se todos foram conferidos e a lista filtrada está vazia, mostrar mensagem de "Todos conferidos"

## Correção adicional: Runtime error `isReadOnly`

O erro `isReadOnly is not defined` vem de um build cacheado. O código atual já não usa essa variável. Um rebuild deve resolver, mas não há mudança de código necessária.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/VeiculosEsperadosPanel.tsx` | Filtrar veículos conferidos da lista visível, mostrar apenas pendentes |

