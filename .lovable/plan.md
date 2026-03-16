

# Auto-preencher Cidade e UF pelo código do cliente

## Mudança

**`src/components/dashboard/CarregamentoDialog.tsx`** — Na função `handleCodigoCliente` (linha 97-103), além de preencher `cliente` e `codigo_cliente`, também preencher `cidade` e `uf` com os dados do cadastro do cliente:

```tsx
const handleCodigoCliente = (codigo: string) => {
  const found = clientes.find((c) => c.codigo_cliente.toLowerCase() === codigo.toLowerCase());
  if (found) {
    set("cliente", found.nome_cliente);
    set("codigo_cliente", found.codigo_cliente);
    set("cidade", found.cidade ?? "");
    set("uf", found.uf ?? "");
  }
};
```

A tabela `clientes` já possui os campos `cidade` e `uf`. O prop `clientes` já é tipado com esses campos disponíveis (verificar interface Props e ajustar se necessário para incluir `cidade` e `uf`).

## Arquivo editado
- `src/components/dashboard/CarregamentoDialog.tsx`

