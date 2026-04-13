

# Permitir que Logística cadastre clientes

## Problema
Atualmente, apenas perfis **admin** e **faturamento** podem inserir e editar clientes. O perfil **logística** não tem permissão.

## Solução
Atualizar as políticas RLS da tabela `clientes` para incluir o role `logistica` nas operações de INSERT e UPDATE.

## Alterações

### Migração SQL
Substituir as duas políticas existentes:

```sql
-- INSERT: adicionar logistica
DROP POLICY "Admin/faturamento insert clientes" ON public.clientes;
CREATE POLICY "Ops insert clientes" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role)
  );

-- UPDATE: adicionar logistica
DROP POLICY "Admin/faturamento update clientes" ON public.clientes;
CREATE POLICY "Ops update clientes" ON public.clientes
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'faturamento'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role)
  );
```

Nenhuma alteração de código no frontend é necessária — a página de Clientes já existe e ficará acessível automaticamente.

1 migração, 0 arquivos de código alterados.

