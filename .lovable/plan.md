

# Corrigir Badge "Pendente Logística" no Kanban

## Problema
Na linha 36, o layout usa `flex justify-between items-start` com o nome do produto e o badge lado a lado. Em colunas estreitas do Kanban, o badge `whitespace-nowrap` transborda horizontalmente, quebrando o layout.

## Solução

### `KanbanView.tsx` (linhas 35-39)
- Mudar de `flex justify-between` para layout empilhado: badge em cima (alinhado à direita), nome embaixo
- Ou: manter flex mas permitir wrap e shrink no nome, e reduzir o badge

**Abordagem escolhida**: Empilhar verticalmente — badge acima do nome, alinhado à direita. Isso evita conflito de espaço.

```tsx
<div className="flex flex-col gap-1">
  <div className="flex justify-end">
    <EtapaBadge etapa={c.etapa} />
  </div>
  <span className="text-xs font-semibold">{c.nome_produto || c.codigo_produto || "Sem produto"}</span>
</div>
```

### `EtapaBadge.tsx`
- Remover `whitespace-nowrap` para permitir quebra de linha se necessário
- Reduzir padding: `px-1.5 py-0.5` e `text-[9px]`

## Arquivos (2)
1. `src/components/dashboard/KanbanView.tsx`
2. `src/components/dashboard/EtapaBadge.tsx`

