## Objetivo
Permitir que usuários com papel **Portaria** editem as informações e fotos dos registros de movimentação no histórico (mesmo botão "Editar" hoje exibido só para Admin/Logística).

## Mudanças

### `src/components/portaria/MovimentoDetailsDialog.tsx`
- Ampliar `canEditPhotos` para incluir `role === "portaria"`, além de `admin` e `logistica`. Isso libera:
  - Botão **"Editar"** (abre `EditMovimentoDialog` com todos os campos: placa, motorista, KM, horários, lacre, nota, ocorrência, peso, entregas, etc.).
  - Ações de **Substituir / Remover / Enviar foto** em cada slot de evidência (placa, painel saída, painel retorno, lacre, nota, documento).

### Sem outras mudanças
- Botão **"Excluir Tudo"** continua restrito a Admin (segurança).
- `EditMovimentoDialog` já tem todos os campos relevantes — sem alteração.
- Sem mudança de schema, RLS ou hooks (a RLS de `movimentacoes_portaria` já permite update para portaria; o gate hoje é só de UI).

## Fora de escopo
- Exclusão de registro inteiro pela portaria.
- Auditoria adicional / trilha de edição (já registrada por `audit_log` existente).
