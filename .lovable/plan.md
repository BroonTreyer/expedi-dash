## Problema

No `EditarCargaDialog` (Editar Carga), os controles de **ordem de entrega** (badge `#N`, setas ↑/↓ e input numérico) só aparecem quando `podeReordenar` é true, e essa condição exige que **pelo menos um cliente já tenha `ordem_entrega` salvo no banco** (`clienteGroups.some(g => g.ordemAtual !== 9999)`).

Resultado: em cargas que ainda **não foram roteirizadas**, nenhum item tem `ordem_entrega`, então:
- todos os clientes ficam com `ordemAtual = 9999`,
- `podeReordenar = false`,
- a UI esconde os botões e só mostra o aviso pequeno "(roteirize a carga para habilitar reordenação manual)".

Por isso o usuário diz que "não aparece em lugar nenhum".

## Solução

Permitir editar a ordem manualmente **sempre que houver 2+ paradas**, independente de roteirização prévia. Quando a carga ainda não tem ordem, atribuímos uma ordem inicial (1, 2, 3…) seguindo a sequência atual (alfabética/inserção) assim que o usuário começa a interagir, e ele pode reorganizar livremente.

## Mudanças

### `src/components/dashboard/EditarCargaDialog.tsx`

1. **Trocar a condição de `podeReordenar`** para depender apenas do número de paradas:
   ```ts
   const podeReordenar = totalParadas >= 2;
   ```

2. **Atribuir ordem padrão** quando nenhum cliente tem ordem ainda. No cálculo de `clienteGroups`, se `ordemPorCliente[k]` for indefinido **e nenhum cliente do grupo tem ordem salva**, usar a posição sequencial (1..N) na ordem atual da lista (que já vem ordenada por `ordem_entrega` ou pela ordem natural dos itens).
   - Manter `ordemAtual: ordemPorCliente[k] ?? <fallbackPos>` no objeto.
   - O fallback é só visual — só vira update no banco se o usuário **reordenar** (clica nas setas / muda input). Para isso, adicionar um estado `dirty: boolean` que vira true ao chamar `reorderTo`.

3. **Persistir somente quando dirty**: em `handleSave`, montar `ordemUpdates` com **todas** as paradas (1..N) se `dirty === true`, mesmo as que tinham `ordem_entrega = null`. Caso contrário, não enviar `ordemUpdates` (preserva comportamento atual).

4. **Remover/atualizar o aviso** "(roteirize a carga…)" — substituir por um texto curto: "Use ↑/↓ ou digite a posição para reordenar as paradas".

5. **Badge "—" some**: como toda parada agora terá uma posição visível (real ou inicial), exibir sempre `#N` no cabeçalho de cada cliente.

### Sem outras mudanças

- `Consolidado.tsx` já aceita `ordemUpdates` no `editCargaMut` e grava em `carregamentos_dia.ordem_entrega` — não precisa mexer.
- Sem migração de banco: o campo `ordem_entrega` já existe e aceita inteiros.
- Sem mudança em `Index.tsx` ou outras telas.

## Resultado esperado

Ao abrir **Editar Carga** em qualquer carga com 2+ clientes, o usuário verá imediatamente:
- Cada parada com badge `#1`, `#2`, `#3`…
- Setas ↑/↓ e input numérico ativos para reordenar.
- Ao salvar, a nova ordem é gravada em `ordem_entrega` de todos os itens daquele cliente.
