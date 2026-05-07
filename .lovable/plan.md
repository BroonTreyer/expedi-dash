## Objetivo
1. Os botões **Mais Rápida** e **Mais Econômica** devem aparecer **SEMPRE** nas telas de Roteirizar e Fechar Carga (mesmo antes de calcular ou se uma das variantes falhar).
2. Os marcadores de **pedágio** no mapa precisam aparecer **sempre que existirem** na rota atual.
3. Adicionar uma opção de **mostrar/ocultar pedágios** no mapa.

## O que será alterado

### `src/components/dashboard/RoteirizacaoDialog.tsx`
- Remover a condição `{(rotaRapida || rotaEconomica) && ...}` ao redor do toggle. A barra passa a renderizar sempre que houver destinos calculáveis (≥1 grupo com cidade/uf).
- Quando uma variante ainda não foi calculada, mostrar o botão com label "calculando..." (loader spin) em vez de esconder. Botões ficam `disabled` se a variante correspondente não existir, mas continuam visíveis.
- Adicionar estado `mostrarPedagios` (default `true`) e um terceiro controle ao lado do toggle: um `Switch` (shadcn) com label "Pedágios" — alterna a renderização dos marcadores no mapa.
- Passar prop `pedagios={mostrarPedagios ? pedagiosAtual : []}` para `RotaMap`.

### `src/components/dashboard/FechamentoLoteDialog.tsx`
- Mesma mudança: toggle Rápida/Econômica visível sempre que houver `groups` com cidade/uf (não depender mais de `rotaRapida || rotaEconomica`).
- Mesmo `Switch` de "Pedágios" e mesma lógica de `pedagios={mostrarPedagios ? pedagiosAtual : []}`.

### `src/components/dashboard/RotaMap.tsx`
- Nenhuma mudança lógica necessária — já renderiza marcadores quando `pedagios.length > 0`. A visibilidade passa a ser controlada via prop pelo pai (passar `[]` esconde).
- Pequeno ajuste no `pedagioIcon`: garantir z-index acima da polilinha (já é `divIcon`, basta `className` com `z-[1000]`) para sempre aparecer por cima do trajeto azul.

### Layout do controle (uma linha, mobile-friendly)
```text
Trajeto: [⚡ Mais Rápida 320 km · 4h12 · 3 ped.] [💰 Mais Econômica 298 km · 4h45 · 1 ped.]   [Pedágios ●━━]
```

## Comportamento esperado
- Abriu a tela → os 2 botões aparecem imediatamente (cinza/disabled enquanto calcula).
- Cálculo pronto → botões ficam ativos, mostrando km/min/nº de pedágios.
- Se ORS retornar só 1 variante (fallback OSRM/Haversine), o outro botão fica desabilitado mas visível, com texto "indisponível".
- Marcadores `$` de pedágio aparecem no mapa por padrão e somem ao desligar o switch.
- Estado do switch é mantido apenas durante a sessão do diálogo (sem persistência por enquanto).

## Fora do escopo
- Custo real de pedágio (depende de API paga — TollGuru/Qualp).
- Persistir preferência do switch por usuário.
