

# Corrigir erro de exclusão por foreign key + centralizar dados

## Problema
Ao excluir um registro de entrada que possui um retorno vinculado (`movimento_vinculado_id`), o banco rejeita a operação por violação de foreign key. É necessário excluir primeiro o registro vinculado.

## Mudanças

### 1. `src/hooks/useMovimentacoesPortaria.ts` — Fix delete
Na função `useDeleteMovimentacao`, antes de excluir o registro principal:
1. Excluir todos os registros onde `movimento_vinculado_id = id` (retornos vinculados)
2. Depois excluir o registro principal

```typescript
mutationFn: async (id: string) => {
  // Delete linked records first (retornos pointing to this entrada)
  await supabase
    .from("movimentacoes_portaria")
    .delete()
    .eq("movimento_vinculado_id", id);
  // Then delete the record itself
  const { error } = await supabase
    .from("movimentacoes_portaria")
    .delete()
    .eq("id", id);
  if (error) throw error;
},
```

### 2. `src/components/portaria/HistoricoTab.tsx` — Confirmar exclusão do grupo inteiro
Ao excluir um grupo que tem entrada + retorno, excluir ambos. Passar os IDs de ambos os registros do grupo para a função de delete (ou simplesmente confiar no cascade do fix acima).

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useMovimentacoesPortaria.ts` | Excluir registros vinculados antes do principal |

