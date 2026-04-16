
User wants logística role to also be able to delete entire loads (currently only admin can per RLS `Admin delete carregamentos_dia`).

## Plano: Permitir logística apagar cargas

### Mudança

Atualizar a política RLS de DELETE em `carregamentos_dia` para incluir o role `logistica` além de `admin`.

### SQL (migration)

```sql
DROP POLICY "Admin delete carregamentos_dia" ON public.carregamentos_dia;

CREATE POLICY "Admin/logistica delete carregamentos_dia"
ON public.carregamentos_dia
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'logistica'::app_role)
);
```

### Ajuste no frontend

Atualizar mensagem de erro em `src/hooks/useCarregamentos.ts` (`useDeleteCarregamento`) e em `src/pages/Consolidado.tsx` (mutation `deleteCargaMut`) para refletir que agora admin **e** logística podem apagar — mensagem: "Sem permissão para excluir. Apenas administradores e logística podem deletar registros."

### Arquivos

| Arquivo | Ação |
|---------|------|
| Nova migration SQL | Criar — atualizar política RLS |
| `src/hooks/useCarregamentos.ts` | Alterar — mensagem de erro |
| `src/pages/Consolidado.tsx` | Alterar — mensagem de erro |

### Observação

Faturamento continua **sem** permissão para deletar (apenas insert/update) — alinhado com a separação operacional Vendas (faturamento) vs Logística.
