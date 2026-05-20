## Contexto

O botão **Editar carga** no Consolidado já abre o `EditarCargaDialog` para qualquer carga (inclusive já fechada/expedida), e a RLS de `carregamentos_dia` já permite UPDATE para `admin`, `logistica` e `faturamento`. A mutation `editCargaMut` em `Consolidado.tsx` também já aceita `itemUpdates: { peso, motivo_ruptura }` e grava com `peso_manual: true`.

**O que falta:** o diálogo só expõe edição de cabeçalho (nome/placa/motorista/transportadora/ordem) e reordenação/remoção de paradas. Não existe campo para alterar o **peso** (nem a quantidade) de um item já fechado — por isso o caso do Galdson (800 kg) não pode ser corrigido sem desfazer a carga.

## Mudanças

### 1. `src/components/dashboard/EditarCargaDialog.tsx`
- Dentro do bloco "Resumo agregado da parada" (atualmente só mostra peso/rupturas/parciais), renderizar a lista de itens daquela parada com inputs editáveis:
  - **Peso (kg)** — `Input` numérico, valor inicial = `it.peso ?? 0`.
  - **Quantidade** — `Input` numérico, valor inicial = `it.quantidade ?? 0`, com cálculo bidirecional usando o `peso_padrao` do produto (mesma lógica já usada nas telas de Vendas — extrair util se necessário ou replicar inline a regra: alterar peso recalcula qtd e vice-versa, exceto se `peso_manual` ativo).
  - Texto auxiliar mostrando o peso original (`peso_original`) quando diferente.
- Cada alteração atualiza `itemEdits[it.id]` (estado já existente) com o novo `peso` (e, se necessário, adicionar `quantidade` à tipagem). Mantém ordem "Peso antes da Quantidade" conforme padrão do projeto.
- Sem mudança no fluxo: continua salvando via `onSave`, que já marca `peso_manual: true` e não altera `etapa`/`status`.

### 2. `src/pages/Consolidado.tsx`
- Estender a assinatura de `itemUpdates` em `editCargaMut` para incluir `quantidade?: number` e propagar no `payload` do `UPDATE` (junto com o `peso_manual: true` já existente).
- Sem alteração de RLS, sem mudança de etapa.

### 3. Sem migration
A RLS de `carregamentos_dia` (`Ops update carregamentos_dia`) já cobre `admin`, `logistica` e `faturamento` — nenhum ajuste de banco necessário.

## Não muda
- Fluxo de etapas (vendas → logística → portaria) permanece intacto.
- Botão de editar continua visível para todos os perfis autenticados; a permissão real é garantida pela RLS no servidor.
- Realtime + invalidate de `["consolidado"]` já existente faz a UI atualizar para os outros usuários.

## Resultado
Admin/Logística/Faturamento poderão abrir o pedido do Galdson no Consolidado e ajustar o peso (ex.: de 800 kg para o valor correto) diretamente, mesmo após a carga estar fechada, sem desfazer a carga nem afetar portaria.