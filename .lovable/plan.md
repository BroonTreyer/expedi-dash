

# Dar acesso de criação e edição ao perfil Faturamento na página Rupturas

## O que muda

No arquivo `src/pages/Rupturas.tsx`, adicionar o perfil **faturamento** às mesmas permissões que admin tem hoje:

1. **Criar nova ruptura** — O botão "Novo Pedido (Ruptura)" atualmente aparece só para admin. Vai aparecer também para faturamento.
2. **Editar pedido** — `handleEdit` atualmente só permite admin. Vai permitir faturamento também.
3. **Alterar status** — `handleStatusChange` permite admin e logística. Vai incluir faturamento.
4. **Completar (logística dialog)** — `handleComplete` permite admin e logística. Vai incluir faturamento.

Mesma lógica será aplicada ao Painel (`src/pages/Index.tsx`) para garantir consistência, já que o código atual também restringe criação/edição apenas ao admin lá.

## Arquivos (2)
- `src/pages/Rupturas.tsx` — adicionar `isFaturamento` e incluir nas guards de criação, edição, status e complete
- `src/pages/Index.tsx` — mesma alteração para manter consistência

