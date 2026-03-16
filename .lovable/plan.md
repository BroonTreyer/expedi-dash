

# Corrigir busca de clientes e erro de duplicata

## Problema
A tabela `clientes` tem ~4.763 registros, mas o hook `useClientes` usa `supabase.from("clientes").select("*")` sem paginação no banco. O Supabase retorna no máximo **1.000 registros por padrão**. Resultado: o cliente existe no banco (insert falha com duplicata), mas não aparece na busca do frontend porque está além dos primeiros 1.000.

## Solução

### 1. `src/hooks/useClientes.ts` — Buscar todos os registros
Substituir a query simples por uma função que faz fetch paginado (loop com `.range()`) para trazer todos os registros:

```ts
queryFn: async () => {
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nome_cliente")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData;
};
```

### 2. `src/hooks/useClientes.ts` — Mensagem amigável para duplicata
No `onError` de `useCreateCliente`, detectar erro de unique constraint e exibir: "Já existe um cliente com este código."

## Arquivos afetados
- `src/hooks/useClientes.ts`

