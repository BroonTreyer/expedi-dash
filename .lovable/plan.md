Objetivo: terceirizado em `etapa='chegada'` SEM `carga_id` (caso FLENDSON) deve aparecer **apenas** como card vermelho “Aguardando vínculo” na aba Pátio. Nada mais — não conta no badge da aba, não conta no KPI “No Pátio”, não conta em “Entradas Hoje”.

Mudanças:

1. `src/components/portaria/PatioAtualTab.tsx`
   - Manter o card vermelho “Aguardando vínculo” já existente (ele renderiza FLENDSON).
   - Garantir ordenação para o vermelho ficar no topo da lista.

2. `src/pages/Portaria.tsx` — badge da aba Pátio
   - Trocar `counts.patio = movimentacoesAtivasPatio.length` por uma contagem que **exclua** registros `terceirizado + etapa='chegada' + carga_id null` (os “aguardando vínculo”).

3. `src/components/portaria/PortariaKpiCards.tsx` — KPI “No Pátio” e “Entradas Hoje”
   - “No Pátio” terceirizado: exigir `horario_entrada IS NOT NULL` e `etapa <> 'finalizado'`. Excluir explicitamente `etapa='chegada' + carga_id null`.
   - “Entradas Hoje”: passar a contar apenas entradas com `horario_entrada` preenchido (entrada física no pátio). Aguardando vínculo não conta como entrada.

Resultado esperado em `/portaria/terceirizado` hoje:
- KPIs: Entradas Hoje = 1 (CARLOS MARABA), Saídas = 0, No Pátio = 1.
- Badge da aba Pátio = 1.
- Lista mostra 2 itens: card vermelho FLENDSON no topo + linha verde CARLOS MARABA.

Verificação pós-implementação na prévia: confirmar números acima e que FLENDSON aparece em vermelho com botões “Vincular carga” / “Desfazer”.