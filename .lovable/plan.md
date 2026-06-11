# Pedidos da pré-carga sumiram após "excluir"

## Diagnóstico

Os pedidos NÃO foram deletados — eles voltaram para a etapa de **Aprovações pendentes** (etapa `aguardando_faturamento`) e perderam o `nome_carga` / `carga_id`. Por isso não aparecem mais na lista de pré-cargas nem no nome "EDIVAR +DMA".

Confirmado pelo Audit Log:

- 4 pedidos da carga `EDIVAR +DMA` (PRE-20260609-141855-16P) foram alterados às **18:26** por `logistica@frico.ind.br`:
  - `etapa: pre_carga → aguardando_faturamento`
  - `carga_id: PRE-20260609-141855-16P → null`
  - `nome_carga: EDIVAR +DMA → null`

Eles estão agora em **Aprovações pendentes** (`/aprovacoes`) com o `numero_pedido` e `cliente` originais preservados. Nada foi perdido.

A ação que faz isso é "remover pedido" dentro do diálogo de pré-carga (`useRemoverPedidoPreCarga` e `onRemoveItems` em `Index.tsx`). O usuário interpretou como exclusão definitiva.

## O que vou ajustar

### 1. Mensagem clara após remover (com atalho)

Em `useRemoverPedidoPreCarga`, `onRemoveItems` (Index.tsx) e `handleCancelPreCargaConfirm`:

- Toast com texto explícito: **"X pedido(s) voltaram para Aprovações pendentes"** (no caso do cancelar, "voltaram para Vendas").
- Action no toast: **"Ver agora"** → `navigate("/aprovacoes")` (ou `/`, na aba Vendas, conforme o caso).

### 2. Preservar rastro no pedido

Antes de zerar `nome_carga` / `carga_id`, anexar em `observacoes` uma linha:

```
[Removido da pré-carga <nome_carga> em DD/MM/YYYY HH:mm por <email>]
```

Isso permite achar via SmartSearch ("EDIVAR") mesmo depois da remoção, e mantém histórico para auditoria informal (além do Audit Log, que continua sendo a fonte oficial).

### 3. Texto do diálogo de confirmação mais explícito

Em `Index.tsx` linha 1033 (`description` do `CancelarPreCarga`) e no botão de remover individual: trocar "voltarão para vendas" / "removido da pré-carga" por uma frase que deixe claro **para onde vão** e que **NÃO são apagados**. Ex.:

> "Os N pedidos voltam para 'Aprovações pendentes' (não são apagados). Você poderá adicioná-los a outra pré-carga depois."

### 4. (Opcional, baixa prioridade) "Desfazer" rápido

Após remoção, deixar o toast aberto por ~10s com action "Desfazer", que rea-aplica `etapa='pre_carga'`, restaura `carga_id` e `nome_carga` para os ids afetados. Só implemento se quiser — aumenta complexidade.

## Arquivos afetados

- `src/hooks/usePreCargas.ts` — `useRemoverPedidoPreCarga`: anexar observação, retornar info para toast.
- `src/pages/Index.tsx` — `handleCancelPreCargaConfirm` e `onRemoveItems` do `FechamentoLoteDialog`: mesma lógica + toast com ação de navegação.
- `src/components/dashboard/FechamentoLoteDialog.tsx` (se for ele que dispara `onRemoveItems`) — só ajuste de texto, se necessário.

## Sobre a carga EDIVAR atual

Os 4 pedidos estão em `/aprovacoes`. Posso, se quiser, em um próximo turno: (a) restaurá-los na pré-carga `EDIVAR +DMA` via um update direto, ou (b) deixar onde estão para você reagrupar manualmente. Diga qual prefere.

## Fora de escopo

- Não alteramos a regra de FSM (continua válida mover para `aguardando_faturamento` ao desvincular).
- Não criamos lixeira/soft-delete para pré-cargas — o Audit Log já cobre rastreabilidade.
