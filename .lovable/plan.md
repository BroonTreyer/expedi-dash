

# Corrigir peso manual sendo sobrescrito ao editar

## Problema Raiz

Existem **dois caminhos** que sobrescrevem o peso manual:

1. **`handleItemCodigo` (linha 164-169)**: Quando o código do produto é preenchido/alterado, ele força `peso: pp * quantidade` sem verificar se `pesoManual` é `true`. No modo edição, quando o dialog abre e o código do produto já está preenchido, qualquer re-render que dispare essa função apaga o peso manual.

2. **`useEffect` de inicialização (linha 73-95)**: Quando o dialog reabre para edição, ele sempre seta `pesoManual: false`, o que é correto para a abertura inicial. Porém, o `useEffect` depende de `[editing, open, selectedDate]` — se `open` ou `selectedDate` mudar durante a edição (ex: o dialog pisca), ele reseta todo o estado incluindo o peso que o usuário digitou.

## Solução

### `src/components/dashboard/CarregamentoDialog.tsx`

**Mudança 1 — `handleItemCodigo` (linhas 159-172):**
- Antes de sobrescrever o peso, verificar se `item.pesoManual` é `true`
- Se for, manter o peso atual do item e só atualizar nome/pesoPadrao

**Mudança 2 — `useEffect` de inicialização (linhas 73-95):**
- Usar uma ref para rastrear se o dialog já foi inicializado para o `editing.id` atual
- Só resetar o estado quando o `editing` realmente mudar (novo id), não quando `open` pisca

| Arquivo | Mudança |
|---|---|
| `CarregamentoDialog.tsx` | Respeitar `pesoManual` em `handleItemCodigo`; evitar reset desnecessário do estado |

