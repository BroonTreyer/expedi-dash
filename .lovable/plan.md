## Objetivo

Simplificar o relatório PDF de pré-carga (`PreCargaPrintDialog`) para exibir **apenas** as informações essenciais da carga e os produtos que estão em ruptura, removendo a tabela completa de pedidos e os KPIs intermediários.

## O que muda no PDF

### Mantém
- Cabeçalho com logo Frico, nome da carga e data
- Identificação resumida (placa, motorista, transportadora, tipo, ordem, destinos)
- Tabela de **Rupturas** (pedido, cliente, código, produto, tipo, original, carregado, diferença, motivo)
- Rodapé simples (total de rupturas e peso em ruptura)

### Remove
- Bloco de KPIs numéricos (pedidos, peso planejado, embarcado, em ruptura)
- Tabela completa de **Pedidos** (com todos os pedidos da carga)
- Rodapé com "X pedidos · Y rupturas"

## Implementação

1. Editar `src/components/precargas/PreCargaPrintDialog.tsx`:
   - Remover a seção `KPIs` (grid de 4 colunas com pedidos/peso planejado/embarcado/ruptura)
   - Remover a tabela de `Pedidos` inteira (`<table>` com map de `carga.pedidos`)
   - Simplificar o rodapé para mostrar apenas o total de rupturas e peso em ruptura
   - Manter header, identificação e tabela de rupturas detalhadas exatamente como estão

Nenhum outro arquivo precisa ser alterado.

## Arquivos alterados

- `src/components/precargas/PreCargaPrintDialog.tsx`