## Problema

Hoje a tela `/portaria/terceirizado` exibe dois painéis com títulos quase idênticos:

1. **Vermelho/primário** — `SolicitacoesPendentesPanel` → "Aguardando vínculo da Logística" (lê `veiculos_esperados` walk-in).
2. **Laranja/âmbar** — `AguardandoVinculoLogisticoPanel` (novo, criado na Onda 5) → "Aguardando Vínculo Logístico" (lê `movimentacoes_portaria` de terceirizados em etapa `chegada` sem `carga_id`).

Você quer manter só o **vermelho** e remover o **laranja**.

## Solução

Unificar tudo no painel vermelho existente (`SolicitacoesPendentesPanel`), eliminando o painel âmbar.

### Passos

1. **Remover** a renderização do `AguardandoVinculoLogisticoPanel` em `src/pages/Portaria.tsx` (linha 394) e o respectivo `import` (linha 26).
2. **Excluir** o arquivo `src/components/portaria/AguardandoVinculoLogisticoPanel.tsx` (não é mais usado).
3. **Garantir** que terceirizados que chegam direto pela Portaria sem walk-in (registros em `movimentacoes_portaria` `etapa_terceirizado='chegada'` sem `carga_id`) também sejam exibidos no painel vermelho. Para isso, ajustar `useVeiculosWalkInAtivos` (em `src/hooks/useVeiculosEsperados.ts`) — ou o `SolicitacoesPendentesPanel` — para incluir esses movimentos como itens "aguardando vínculo", reusando o `VincularMovimentoCargaDialog` quando o item vier de `movimentacoes_portaria`.
4. **Manter** o filtro do `PatioAtualTab` que esconde terceirizados sem `carga_id` (já implementado na Onda 5) — eles continuam fora do Pátio até a Logística vincular.

### Validação

- Tela `/portaria/terceirizado` mostra apenas **um** card vermelho "Aguardando vínculo da Logística".
- Os 4 registros (PBV1F92, JKL9723, RMB0C89, TWD5I87) aparecem dentro desse card único, com botões "Vincular a carga" / "Cancelar chegada" para Admin/Logística.
- Pátio Atual segue mostrando apenas terceirizados já vinculados.

### Arquivos afetados

- `src/pages/Portaria.tsx` (remover import + render)
- `src/components/portaria/AguardandoVinculoLogisticoPanel.tsx` (excluir)
- `src/components/portaria/SolicitacoesPendentesPanel.tsx` (incluir movimentos sem walk-in)
- `src/hooks/useVeiculosEsperados.ts` (estender query `useVeiculosWalkInAtivos` com union dos movimentos terceirizados sem carga_id) — ou criar hook auxiliar consumido pelo painel.
