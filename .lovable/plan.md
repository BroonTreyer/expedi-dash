Problema identificado

No exemplo da imagem, a ruptura está registrada no banco em uma das linhas do grupo, mas o cabeçalho do grupo não mostra o badge.

O motivo é este:

- A tabela agrupa várias linhas pelo cliente/data, então o cabeçalho aparece como “4 produtos” e “2 pedidos”.
- O código já calcula que o grupo tem ruptura (`hasRuptura`).
- Porém, no Dashboard principal a coluna “Etapa” fica escondida (`hideColumns` inclui `etapa`).
- O único indicador de ruptura do cabeçalho do grupo estava dentro dessa coluna escondida. Resultado: o grupo tem ruptura, mas o cabeçalho não mostra nada.
- A linha individual com ruptura mostra o badge corretamente; as outras linhas sem `ruptura`/`ruptura_sinalizada` não devem receber badge individual para não parecer que todos os produtos romperam.

Plano de correção

1. Criar um badge visual reutilizável de ruptura na tabela
   - Em `src/components/dashboard/CarregamentoTable.tsx`, extrair o badge “Ruptura” para um pequeno componente/helper local, para usar igual em linha individual, linha expandida e cabeçalho de grupo.
   - Manter a cor âmbar/laranja já usada hoje.

2. Mostrar “Ruptura” no cabeçalho do grupo multi-produto
   - Quando `group.items.some(temRuptura)` for verdadeiro, renderizar o badge “Ruptura” em uma coluna sempre visível do cabeçalho do grupo.
   - Melhor local: ao lado de “4 produtos” ou ao lado do cliente/pedidos, pois essas áreas continuam visíveis mesmo com a coluna “Etapa” escondida.
   - Assim, no exemplo da imagem, a linha principal “33175 – FRIGORSUL...” / “4 produtos” também indicará que existe ruptura dentro do grupo.

3. Aplicar também no mobile
   - No cabeçalho do card agrupado no mobile, mostrar o badge “Ruptura” quando qualquer item do grupo tiver ruptura.
   - Isso evita o mesmo problema em tela menor.

4. Manter a regra correta nas linhas individuais
   - Linhas individuais continuam mostrando badge apenas quando aquela linha tiver `ruptura` ou `ruptura_sinalizada`.
   - Não vou marcar todos os produtos do grupo como ruptura se só um produto rompeu.
   - O cabeçalho do grupo mostrará “Ruptura” como aviso geral de que existe pelo menos uma ruptura dentro daquele grupo.

Resultado esperado

No caso da imagem:

- A linha expandida que realmente tem ruptura continua com o badge.
- O cabeçalho do grupo também passa a mostrar “Ruptura”, mesmo com a coluna “Etapa” escondida.
- Produtos sem ruptura continuam sem badge individual.