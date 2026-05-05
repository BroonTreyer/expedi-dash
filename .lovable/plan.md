## Plano

### 1) Correção pontual do registro
UPDATE em `movimentacoes_portaria` id `60664836-74c2-4b45-a4ac-b4d86eb6d5ee` (DKO0H12 / FABRICIO, em rota desde 05/05):
- `km_inicial`: 124.431 → **132.667**

O trigger `validate_km_rodado` recalcula `km_rodado` automaticamente quando o `km_final` for preenchido na chegada.

### 2) Novo componente `EditarKmDialog` (`src/components/portaria/EditarKmDialog.tsx`)
- Inputs **KM Inicial** e **KM Final** (number, formato pt-BR).
- Validações espelhando o trigger do banco:
  - `km_final ≥ km_inicial`
  - diferença ≤ 3.000 km
- Usa o hook existente `useUpdateMovimentacao`.
- Toast de sucesso/erro (sonner).

### 3) Botão "Editar KM" no Pátio Atual / Carga Própria
- Na página `/portaria/carga-propria`, adicionar botão (ícone lápis) em cada card de veículo nas etapas `chegou`, `em_rota`, `retornou`.
- Visível para admin / logística / portaria (já coberto por RLS).
- Abre o `EditarKmDialog`.

### 4) Auditoria — migration
Ampliar a função `audit_movimentacoes` para incluir no diff:
- `km_inicial`, `km_final`, `km_rodado`

Hoje essas mudanças não são logadas, e a edição de KM impacta o relatório de motoristas — precisa rastreabilidade.

### Arquivos
- **Novo:** `src/components/portaria/EditarKmDialog.tsx`
- **Editar:** `src/pages/PortariaCargaPropria.tsx` (ou subcomponente do card — confirmo na implementação)
- **Migration:** atualizar trigger function `audit_movimentacoes` + UPDATE pontual no FABRICIO
