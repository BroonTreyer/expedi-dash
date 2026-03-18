

# Unificar Movimentos por Placa no Histórico

## Conceito
Em vez de mostrar uma linha separada para cada entrada e saída, agrupar movimentos pela placa. Cada linha mostra a placa uma vez, com badges de Entrada e Saída lado a lado, horários de entrada/saída, e os dados do veículo.

## Lógica de Agrupamento
1. Filtrar movimentos normalmente (search, categoria, tipo)
2. Agrupar por placa usando um `Map<string, { entrada?: Mov, saida?: Mov }>`
3. Vincular entrada/saída via `movimento_vinculado_id` (saída aponta para entrada)
4. Movimentos sem par (só entrada ou só saída) aparecem normalmente com apenas um badge
5. Ordenar grupos pelo horário mais recente

## Layout da Linha (Desktop)

| Hora | Tipo | Categoria | Placa | Motorista | Empresa | Ações |
|---|---|---|---|---|---|---|
| 11:06 → 11:12 | `[Entrada] [Saída]` | Carga Própria | 651651 | João | Empresa X | Detalhes |

- Coluna "Hora": mostra `HH:mm → HH:mm` (entrada → saída), ou só um horário se não tem par
- Coluna "Tipo": dois badges lado a lado (Entrada verde + Saída cinza), ou apenas um se sem par
- Ao clicar "Detalhes", abre detalhes da entrada (mov principal do grupo)

## Layout Mobile (Card)
- Placa em destaque no topo
- Badges Entrada/Saída lado a lado com horários
- Categoria, motorista, empresa abaixo

## Arquivo a modificar
- `src/components/portaria/HistoricoTab.tsx` — adicionar `useMemo` para agrupar por placa/vínculo, redesenhar linhas da tabela e cards mobile

## Filtro "Tipo"
- Quando filtro "Entradas" ativo: mostrar apenas grupos que têm entrada
- Quando filtro "Saídas" ativo: mostrar apenas grupos que têm saída
- "Todos": mostra tudo agrupado

