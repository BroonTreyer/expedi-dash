# OC por pedido no diálogo "Fechar Carga"

## Problema
Hoje, no diálogo "Fechar Carga", os pedidos do mesmo cliente são agrupados em uma única linha por destino (mesmo `codigo_cliente`). O input de "OC..." é um por linha — então, quando o mesmo cliente tem 2 pedidos diferentes (PEITO DE FRANGO e COXINHA DA ASA, no print), só dá pra digitar **uma** OC, e ela é aplicada aos dois pedidos.

Os modos atuais são apenas:
- **OC única** — uma OC para a carga toda
- **Por grupo** — uma OC por destino/cliente

Falta um modo para informar **uma OC por pedido**.

## O que vai mudar (apenas UI do diálogo "Fechar Carga")

Arquivo: `src/components/dashboard/FechamentoLoteDialog.tsx`

1. **Adicionar terceiro modo "Por pedido"** ao seletor de modo de OC, ao lado de "Única" e "Por grupo".
2. **Novo estado** `ordemCargaPorPedido: Record<string, string>` (chaveado pelo `id` da linha de `carregamentos_dia` — ou seja, por pedido/produto, mesmo nível do checkbox da tabela).
3. **Renderização no modo "Por pedido"**:
   - A linha do destino continua agrupada (preserva a roteirização e o mapa).
   - Logo abaixo de cada destino, listar os pedidos daquele grupo (número do pedido + peso) com um input "OC..." dedicado para cada um.
   - Quando o grupo tem só 1 pedido, mostrar o input inline (igual hoje), sem duplicar.
4. **Validação** (`podeEnviar`): no modo "Por pedido", exige pelo menos uma OC preenchida entre todos os pedidos.
5. **Submit / Pré-carga / Print** (`handleSubmit`, `handleSavePreCarga`, `onPrintReady`):
   - No modo "Por pedido", `ordem_carga` de cada `update` vem de `ordemCargaPorPedido[item.id]`.
   - Mantém o fallback atual (primeira OC válida) para itens em branco, igual ao "Por grupo".
   - No print, agrupar por OC distinta dentro do mesmo destino quando houver mais de uma — o `CargaPrintDialog` já aceita `ordemCarga` por grupo; vamos expandir o array de `groups` desse payload para incluir uma entrada por (cliente, OC) quando o modo for "Por pedido", para que o romaneio mostre cada OC separadamente.

## Fora do escopo
- Nenhuma mudança em backend, schema, hooks, ou em outros diálogos.
- Modo "Única" e "Por grupo" continuam funcionando exatamente como hoje (sem regressão).
- Lógica de roteirização, peso, mapa e ordenação não muda.
