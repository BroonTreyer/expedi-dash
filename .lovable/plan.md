## Mudança

Em `src/pages/PreCargas.tsx`, na função `PedidoRow`, remover o limite de 3 chips de ruptura:

- Trocar `rupturas.slice(0, 3)` por renderizar todas (`rupturas`).
- Remover o cálculo de `rupturasExtra` e o badge `+N items`.

Sem alterações em dados, hooks ou layout — os chips já quebram em várias linhas via `flex flex-wrap`, então mostrar todos continua responsivo.