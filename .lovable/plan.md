## Problema

No diálogo "Roteirização", o resumo no topo mostra `14.671,2 kg`, que é o peso **embarcado** (exclui itens em ruptura). Já no diálogo "Fechar Carga" o número exibido como total é `embarcados + ruptura` (peso planejado), por isso os dois divergem.

## Correção

Arquivo único: `src/components/dashboard/RoteirizacaoDialog.tsx`

1. Adicionar um memo `totalPlanejado` somando `g.pesoPlanejado ?? g.pesoTotal` dos `activeGroups` (mesma fórmula do `FechamentoLoteDialog`).
2. No resumo (linha ~740), trocar `{totalPeso.toLocaleString("pt-BR")} kg` por `{totalPlanejado.toLocaleString("pt-BR")} kg`, para bater exatamente com o "kg total" do Fechar Carga.
3. Se houver ruptura (`totalPlanejado > totalPeso`), exibir ao lado, em texto pequeno/muted, `↳ X kg embarcados`, mantendo a transparência já presente no Fechar Carga sem poluir o cabeçalho.

Nenhuma lógica de roteirização, exportação ou cálculo de combustível é alterada — apenas o número mostrado no cabeçalho.

## Validação

Abrir uma carga com itens em ruptura, comparar o "kg" do Roteirizar com o "kg total" do Fechar Carga: devem ser idênticos.
