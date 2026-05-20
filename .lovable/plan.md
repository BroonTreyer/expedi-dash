## Contexto

Hoje, dentro do `EditarCargaDialog` (Consolidado), cada parada (cliente) mostra peso/rupturas/parciais + botão "Remover parada" e, na implementação atual, também inputs de peso/quantidade por item — o que polui a UI quando a parada tem vários produtos.

A tela de Aprovações já tem um diálogo completo (`EditarPedidoAprovacaoDialog`) que, junto com o hook `useEditarPedidoAprovacao`, faz tudo o que precisamos por pedido: editar peso e quantidade (com cálculo bidirecional), adicionar produto, remover item, recalcular preços, e até herdar o contexto da carga via `preCargaContext` para que novos itens nasçam dentro da mesma carga.

## Mudanças

### 1. `src/components/dashboard/EditarCargaDialog.tsx`
- **Remover** os inputs de peso/quantidade por item adicionados na rodada anterior (e o estado `itemEdits` correspondente — junto com a propagação no `onSave`).
- No cabeçalho de cada parada (cliente), ao lado do botão "Remover parada", adicionar um botão **"Editar pedido"** (ícone `Pencil` + texto, `variant="outline"`, `size="sm"`).
- Esse botão abre um novo `EditarPedidoAprovacaoDialog` controlado por estado local (`pedidoEditando: Carregamento[] | null`), passando:
  - `grupo` = todos os `cg.itens` daquela parada (mesmo cliente + mesma carga).
  - `preCargaContext` montado a partir do `group` atual (`carga_id`, `nome_carga`, `placa`, `motorista`, `transportadora`, `tipo_caminhao`, `ordem_carga`) — assim, qualquer produto adicionado entra na mesma carga já fechada sem mudar `etapa`/`status`.
- Ao fechar o sub-diálogo, invalidar as queries do Consolidado (já tratado dentro do próprio hook `useEditarPedidoAprovacao`, que invalida `["carregamentos"]`).

### 2. `src/components/aprovacoes/EditarPedidoAprovacaoDialog.tsx` (ajuste mínimo)
- Quando `preCargaContext` estiver presente, o dialog já esconde o botão "Salvar e aprovar". Verificar/garantir que o título do diálogo fique algo como "Editar pedido na carga" para o contexto de Consolidado (pode-se passar uma prop opcional `titleOverride?: string`, default mantém comportamento atual).

### 3. `src/hooks/useEditarPedidoAprovacao.ts` (ajuste pontual)
- O hook já trata `preCargaContext` mantendo novos itens na mesma carga com `etapa: "pre_carga"`. Para o Consolidado, a carga já está em etapas posteriores (`logistica`/`portaria`/`expedida`). Estender `preCargaContext` com um campo opcional `etapaAlvo?: string` (default `"pre_carga"`); quando vier preenchido, usar esse valor no `INSERT` dos novos itens em vez de `"pre_carga"`. No `EditarCargaDialog`, passar `etapaAlvo = group.items[0].etapa` para que produtos adicionados herdem a mesma etapa dos demais da carga.
- Sem mudança nas RLS: `admin`/`logistica`/`faturamento` já podem UPDATE/INSERT/DELETE em `carregamentos_dia`.

### 4. `src/pages/Consolidado.tsx`
- Remover a extensão `quantidade` em `itemUpdates` adicionada na rodada anterior (não é mais necessária — toda a edição de itens passa pelo hook de aprovações).

## Não muda
- Fluxo de etapas, portaria, expedição: nada disso é tocado.
- A reordenação de paradas e a edição dos campos de cabeçalho da carga continuam funcionando como hoje.
- RLS e permissões: já cobertas.

## Resultado
Cada parada do `EditarCargaDialog` ganha um botão "Editar pedido" discreto. Ao clicar, abre o mesmo diálogo de pedido usado em Aprovações, onde admin/logística/faturamento podem ajustar peso, adicionar ou remover produtos do pedido do Galdson (ou qualquer outro), sem poluir a tela de edição da carga e sem afetar o fluxo já fechado.
