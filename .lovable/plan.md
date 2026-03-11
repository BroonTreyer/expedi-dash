

# Corrigir EtapaBadge na Tabela

## Problema
O Badge base usa `rounded-full`, e com o texto "Pendente Logística" quebrando em duas linhas dentro de uma célula estreita (70px), ele vira um círculo gigante e feio.

## Solução

### `EtapaBadge.tsx`
- Adicionar `whitespace-nowrap` para impedir quebra de linha
- Trocar para `rounded-md` ao invés do `rounded-full` padrão do Badge

### `CarregamentoTable.tsx` (linha 129)
- Aumentar a largura da coluna Etapa de `w-[70px]` para `w-[120px]` para acomodar o texto sem quebra

## Arquivos (2)
1. `src/components/dashboard/EtapaBadge.tsx`
2. `src/components/dashboard/CarregamentoTable.tsx`

