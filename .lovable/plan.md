

# Corrigir erro "Component is not a function" (cache do Vite)

O erro persiste no preview por causa do cache de dependências do Vite (`.vite/deps`). O arquivo `sortable-table-head.tsx` está correto, mas o bundle cacheado ainda referencia a versão antiga (sem `forwardRef`).

## Correção

1. Limpar o cache do Vite (`node_modules/.vite`)
2. Forçar rebuild para que o preview funcione sem erro

1 comando, sem alteração de código.

