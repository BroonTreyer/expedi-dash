
## Diagnóstico

`SolicitacoesPendentesPanel` é renderizado em `Portaria.tsx` (usado por `PortariaCargaPropria` e `PortariaTerceirizado`) sem nenhum filtro por categoria. Internamente usa `useVeiculosWalkInAtivos`, que faz `select * from veiculos_esperados where walk_in=true ...` sem filtrar por `grupo`. Resultado: ambas as sub-páginas exibem o mesmo bloco com todos os walk-ins (próprios + terceiros).

A categoria é determinada a partir do campo `grupo` do veículo esperado (linha 140 do hook: `grupo` contém "PROPRIA"/"PRÓPRIA" → carga_propria; senão → terceirizado).

## Plano

### 1. Aceitar prop `categoria` no painel
`SolicitacoesPendentesPanel` recebe `categoria: "carga_propria" | "terceirizado"`.

### 2. Filtrar a lista no client
Após carregar `ativos` via `useVeiculosWalkInAtivos`, filtrar:
- `carga_propria` → `grupo` contém "PROPRIA" ou "PRÓPRIA" (case-insensitive)
- `terceirizado` → todo o resto (mesma regra invertida usada no `registrarChegada` do hook, mantém consistência)

### 3. Passar a prop em `Portaria.tsx`
`<SolicitacoesPendentesPanel categoria={categoria} />`

### Sem mudanças
- Hook `useVeiculosWalkInAtivos` (mantém genérico — pode ser reaproveitado em outras telas)
- Schema, RLS, fluxo de autorização/recusa, realtime channel
- Lógica de "Vincular a carga" / "Liberar Entrada no Pátio"

## Arquivos
- ✏️ `src/components/portaria/SolicitacoesPendentesPanel.tsx` — nova prop `categoria` + filtro por `grupo`
- ✏️ `src/pages/Portaria.tsx` — passar `categoria={categoria}` ao painel
