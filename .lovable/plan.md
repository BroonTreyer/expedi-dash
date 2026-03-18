

# Corrigir Layout das Badges de Categoria

## Problema
A badge "Fornecedor" usa `text-accent-foreground` que resolve para **branco** (`0 0% 100%`), resultando em texto invisível/ilegível sobre fundo verde claro. O correto é usar `text-accent` (verde) para que o texto fique visível.

## Correção
Nos dois arquivos que definem `categoriaBadgeColor`:
- `src/components/portaria/HistoricoTab.tsx`
- `src/components/portaria/PatioAtualTab.tsx`

Alterar a linha do `fornecedor`:
```
// De:
fornecedor: "bg-accent/10 text-accent-foreground border-accent/20"
// Para:
fornecedor: "bg-accent/10 text-accent border-accent/20"
```

Isso garante texto verde legível sobre fundo verde claro, consistente com o padrão das outras badges (ex: `carga_propria` usa `text-primary` sobre `bg-primary/10`).

