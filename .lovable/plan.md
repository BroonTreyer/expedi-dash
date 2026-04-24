## Correção de bugs de refs (warnings React)

### Arquivos a editar
1. **`src/components/portaria/ImportarPlanilhaDialog.tsx`**
   - Envolver o componente em `forwardRef<HTMLDivElement, Props>`
   - Manter toda a lógica atual intacta
   - Exportar com `displayName = "ImportarPlanilhaDialog"`

2. **`src/components/portaria/MovimentoDetailsDialog.tsx`**
   - Envolver o componente em `forwardRef<HTMLDivElement, Props>`
   - Manter toda a lógica atual intacta
   - Exportar com `displayName = "MovimentoDetailsDialog"`

### Padrão aplicado
```typescript
import { forwardRef } from "react";

export const ImportarPlanilhaDialog = forwardRef<HTMLDivElement, Props>(
  function ImportarPlanilhaDialog(props, _ref) {
    // lógica existente sem alterações
  }
);
```

### Resultado esperado
- Eliminação dos warnings "Function components cannot be given refs" no console
- Zero alteração de comportamento funcional
- Padronização com os demais dialogs do projeto