

# Auditoria de Bugs — Problemas Encontrados e Correções

## Bugs Identificados

### Bug 1: Logística não consegue editar pedidos
Em `CarregamentoTable.tsx` (linha 290) e `Index.tsx` (linha 40), a variável `canEdit` é:
```typescript
const canEdit = isAdmin || isFaturamento;
```
Usuários com role **logística** não veem o botão de editar. Isso explica o relato de "outro usuário não consegue editar".

**Correção**: Adicionar `isLogistica` à condição `canEdit` em ambos os arquivos.

### Bug 2: Dependency arrays incorretos em callbacks
Em `Index.tsx`:
- `handleLoteSubmit` (linha 291) lista `updateMut` no dependency array, mas usa `batchUpdateMut.mutate()`. Deveria ser `batchUpdateMut`.
- `handleAdicionarCargaSubmit` (linha 306) lista `updateMut` no dependency array, mas usa `batchUpdateMut.mutate()`. Deveria ser `batchUpdateMut`.

Isso pode causar stale closures — a função referencia uma versão antiga do mutation.

**Correção**: Atualizar os dependency arrays.

### Bug 3: Registros antigos com pesos absurdos (quantidade=1, peso=20.000 kg)
Existem dezenas de registros no banco onde `quantidade = 1` mas `peso` está em valores como 8.000, 10.000, 12.000, 13.000 e até 20.000 kg. Isso aconteceu porque os usuários digitavam o peso total desejado no campo de peso, mas o sistema interpretava como peso unitário. Exemplos:
- CALABRESA 4x2,5kg: qty=1, peso=20.000 (deveria ser 10 kg)
- LINGUIÇA TOSCANA MISTA 4x5kg: qty=1, peso=20.000 (deveria ser 20 kg)

Esses registros inflam os totais de peso em KPIs, consolidado e analytics.

**Correção**: Migration SQL para corrigir registros onde `quantidade = 1` e `peso > peso_padrao * 10` (claramente errados), recalculando como `peso_padrao × quantidade`.

### Bug 4: Warning de React ref no console
`CarregamentoDialog` passa ref para componente `Select` que não aceita refs. É um warning não-crítico mas polui o console.

**Nota**: Não causa bug funcional, prioridade baixa.

## Plano de Implementação

| Arquivo | Mudança |
|---|---|
| `Index.tsx` | `canEdit = isAdmin \|\| isFaturamento \|\| isLogistica`; corrigir dependency arrays |
| `CarregamentoTable.tsx` | `canEdit = isAdmin \|\| isFaturamento \|\| isLogistica` |
| Migration SQL | Corrigir registros com peso absurdo (qty=1, peso >> peso_padrao) |

