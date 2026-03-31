

# Corrigir: Não Consegue Apagar Lista de Veículos Esperados

## Problema

A tabela `veiculos_esperados` tem RLS de DELETE restrito apenas a `admin` (`has_role(auth.uid(), 'admin'::app_role)`). Quando um usuário não-admin clica "Limpar", o Supabase retorna 204 (sem erro), mas não deleta nenhuma linha. O código mostra o toast de sucesso sem verificar se realmente deletou algo.

O mesmo problema afeta a importação, que faz `delete` dos registros antigos antes de inserir os novos.

## Solução

Criar uma migração SQL para alterar a policy de DELETE da tabela `veiculos_esperados`, permitindo que qualquer usuário autenticado possa deletar (assim como já podem INSERT e UPDATE).

### Migração SQL

```sql
DROP POLICY "Admin delete veiculos_esperados" ON public.veiculos_esperados;

CREATE POLICY "Authenticated delete veiculos_esperados"
ON public.veiculos_esperados
FOR DELETE
TO authenticated
USING (true);
```

| Arquivo | Mudança |
|---|---|
| Migração SQL | Trocar policy de DELETE de admin-only para authenticated |

