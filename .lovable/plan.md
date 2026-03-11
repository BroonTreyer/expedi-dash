

# Editar todos os itens de um pedido agrupado

## Problema
O botão "Editar" no cabeçalho do grupo chama `onEdit(first)`, passando apenas o primeiro item. O dialog carrega somente esse item. O usuário espera editar todos os itens do pedido de uma vez.

## Solução
Remover o botão de editar do **cabeçalho do grupo** (já existem botões individuais nas child rows). Dessa forma, o usuário precisa expandir o grupo e clicar no item específico que quer editar — o que já funciona corretamente.

**Alternativa (mais completa):** Manter o botão no cabeçalho mas, ao clicar, expandir automaticamente o grupo para revelar os botões individuais de cada item.

### Mudança — `src/components/dashboard/CarregamentoTable.tsx`
- No cabeçalho do grupo (linhas 415-418), condicionar o botão de editar: se o grupo tem mais de 1 item, o clique abre/expande o grupo ao invés de chamar `onEdit`. Se tem 1 item, mantém o comportamento atual.

```tsx
// Grupo com múltiplos itens: expande ao clicar em editar
{canEdit && (
  <Button variant="ghost" size="icon" className="h-7 w-7"
    onClick={() => group.items.length > 1 ? toggle(groupKey) : onEdit(first)}>
    <Edit className="h-3.5 w-3.5" />
  </Button>
)}
```

Isso garante que pedidos com 1 item editam direto, e pedidos com múltiplos itens expandem para o usuário escolher qual editar.

## Arquivos (1)
- `src/components/dashboard/CarregamentoTable.tsx`

