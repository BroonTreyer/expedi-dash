

# Corrigir Bugs na Criação/Edição de Pedidos

## Problemas Identificados

### Bug 1: Múltiplos itens no modo edição — só o último salva
No `handleSubmit` (linhas 206-215), quando há múltiplos produtos no modo edição, o código chama `onSubmit()` em um `forEach` loop. Cada chamada dispara `createMut.mutate()` separadamente. O React Query **não enfileira** chamadas a `.mutate()` — cada nova chamada sobrescreve o rastreamento da anterior. Resultado: apenas o último item é salvo corretamente. Os outros disparam a request HTTP mas o sucesso/erro não é tratado, e a invalidação de cache fica inconsistente.

### Bug 2: Dialog fecha antes das mutations completarem
O `setTimeout(() => onOpenChange(false), 150)` fecha o dialog em 150ms, independente de as mutations terem finalizado. Se a rede está lenta ou o banco demora, o usuário vê o dialog fechar mas os dados não foram salvos.

### Bug 3: Dados do formulário misturados com dados do editing
Quando o dialog abre para edição, `setForm({ ...editing })` copia TODOS os campos do carregamento para o form, incluindo `created_at`, `updated_at`, `vendedores`, etc. Esses campos extras são enviados no payload e podem causar erros silenciosos ou sobrescrever dados com valores inválidos. A limpeza no `handleSubmit` remove apenas `id`, `vendedores`, `codigo_produto`, `nome_produto`, `quantidade`, `peso` — mas não limpa `created_at`, `updated_at`, etc.

## Solução

### 1. `src/components/dashboard/CarregamentoDialog.tsx`

**Corrigir submit de múltiplos itens no modo edição:**
- Item 0: continua como update (com `id`)
- Itens 1+: agrupar em um `_batch` array e enviar como uma única chamada, igual ao modo de criação

**Aguardar mutations antes de fechar:**
- Remover o `setTimeout` e chamar `onOpenChange(false)` imediatamente — as mutations já são fire-and-forget com otimistic update, não precisam esperar
- Ou melhor: chamar `onOpenChange(false)` sincrono após disparar onSubmit

**Limpar payload de campos indesejados:**
- Adicionar limpeza de `created_at`, `updated_at`, `ruptura_sinalizada` e outros campos do banco que não devem ser reenviados

### 2. `src/pages/Index.tsx`

**Adaptar `handleSubmit` para o novo formato de edição com batch:**
- Quando receber `_batch` + `id` no mesmo payload, fazer update do item principal e batch insert dos novos

## Detalhes Técnicos

| Arquivo | Mudança |
|---|---|
| `CarregamentoDialog.tsx` | Agrupar itens extras em `_batch`; limpar campos de sistema do payload; remover `setTimeout` no close |
| `Index.tsx` | Tratar novo formato `{ id, _batch, ...basePayload }` no `handleSubmit` |

