
Add a "Delete load" button inside the EditarCargaDialog (Consolidado page) that allows admin users to delete an entire closed load.

## Plano: Apagar carga fechada no Consolidado

### O que será feito

Adicionar um botão "Apagar carga" no diálogo de edição (`EditarCargaDialog`) que remove a carga inteira — todos os pedidos vinculados àquele `carga_id`.

### Comportamento

- Botão **"Apagar carga"** vermelho/destrutivo no rodapé esquerdo do diálogo
- Confirmação obrigatória via `DeleteConfirmDialog` com aviso claro: "Esta ação apagará TODOS os X pedidos desta carga permanentemente"
- Ao confirmar: deleta todos os registros de `carregamentos_dia` cujo `carga_id` corresponde
- Apenas admin pode executar (RLS já protege: `Admin delete carregamentos_dia`)
- Se usuário não-admin clicar, o backend retorna erro e exibe toast: "Apenas administradores podem apagar cargas"
- Após sucesso: fecha diálogo, toast "Carga apagada", invalida cache

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/dashboard/EditarCargaDialog.tsx` | Alterar — adicionar botão + handler + confirmação |
| `src/pages/Consolidado.tsx` | Alterar — adicionar prop `onDeleteCarga` e mutation que faz `delete().eq('carga_id', cargaId)` |

### Detalhes técnicos

- Usar `supabase.from("carregamentos_dia").delete({ count: "exact" }).eq("carga_id", cargaId)`
- Verificar `count === 0` para detectar falta de permissão (RLS bloqueou)
- Optimistic update opcional — preferir invalidação após sucesso para garantir consistência
- Realtime DELETE já remove os itens do cache automaticamente (hook `useCarregamentos`)

### Visual do rodapé do diálogo

```text
[Apagar carga]              [Cancelar] [Salvar]
   (vermelho, esquerda)        (direita, atual)
```
