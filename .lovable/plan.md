

# Ocultar pedidos com carga fechada do Painel

## Problema
O filtro atual usa `status === "Carregado"` para ocultar itens, mas nenhum pedido no banco tem esse status ainda. A regra correta é: pedido com `carga_id` preenchido (carga fechada) deve sair do Painel e aparecer apenas no Consolidado.

## Alterações

### 1. `src/pages/Index.tsx`
- Trocar a condição de `c.status === "Carregado"` para `c.carga_id != null` no filtro `filtered` e no cálculo de `finalizadosCount`

### 2. `src/hooks/useCarregamentos.ts`
- Na query de carry-over de dias anteriores, trocar `status.neq.Carregado` por `carga_id.is.null` para que pedidos antigos com carga fechada não sejam puxados para o dia atual

## Arquivos
- `src/pages/Index.tsx`
- `src/hooks/useCarregamentos.ts`

