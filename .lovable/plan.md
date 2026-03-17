

# Adicionar filtro de data para o perfil Logística

## Problema
O bloco de retorno antecipado para `isLogistica` (linha 84-111) não inclui o campo `Input type="date"`, então usuários com perfil "logistica" não veem o filtro de data.

## Solução
Adicionar o `Input type="date"` no início do bloco de filtros da Logística (dentro do `if (isLogistica)`), antes do MultiSelect de Vendedores.

### `src/components/dashboard/Filters.tsx`
- Inserir o campo de data no return do `isLogistica`, na mesma posição que aparece para os demais perfis:
```tsx
if (isLogistica) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="date"
        value={filters.data}
        onChange={(e) => set("data", e.target.value)}
        className="h-9 text-sm w-[140px]"
      />
      <MultiSelectFilter ... />
      ...
    </div>
  );
}
```

## Arquivo editado
- `src/components/dashboard/Filters.tsx`

