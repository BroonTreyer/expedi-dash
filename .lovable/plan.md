## Editar ordem de entrega dentro de carga fechada (Consolidado)

Hoje, no Consolidado, ao abrir "Editar Carga" você só pode:
- Inverter a ordem completa (botão "Inverter ordem")
- Editar peso/remover pedidos

**Não existe** controle para reordenar manualmente cada parada (ex.: mover o cliente da parada #3 para #1). É isso que vamos adicionar.

### O que será feito

**1. Reordenação manual no `EditarCargaDialog`**
- Cada pedido na lista ganha controles de ordem ao lado do badge `#N`:
  - Botões ▲ / ▼ para subir/descer **a parada inteira do cliente** (todos os itens do mesmo cliente sobem juntos, mantendo a lógica de "1 parada = 1 cliente")
  - Campo numérico editável para digitar diretamente a posição desejada
- Renumeração automática (1..N sem buracos) ao salvar
- Suporte a drag-and-drop opcional (mais intuitivo que setas) usando `@dnd-kit` se já estiver no projeto, senão apenas setas + input

**2. Agrupamento por cliente na edição**
- A lista do diálogo passa a mostrar os pedidos **agrupados por cliente** (com cabeçalho da parada) — assim fica claro que reordenar move o cliente todo, não cada item de produto isoladamente. Isto bate com o que sai no romaneio.

**3. Persistência**
- Ao clicar "Salvar", além dos campos atuais (placa, motorista, etc.) e edições de peso, enviamos um `Map<itemId, novaOrdem>` para a mutation `editCargaMut`.
- A mutation já faz updates por item via `Promise.all`; estendemos para também atualizar `ordem_entrega` por id.
- Todos os itens do mesmo cliente recebem o mesmo `ordem_entrega`.

**4. Validação e UX**
- Se a carga não tiver ordens definidas (cargas antigas sem roteirização), os botões aparecem desabilitados com tooltip "Roteirize a carga primeiro" — ou alternativamente permitimos atribuir ordem sequencial inicial automaticamente ao abrir.
- Mantém os botões existentes "Inverter ordem" e "Desfazer carga".
- Salvar invalida `consolidado` e `carregamentos` (já feito), e o romaneio reflete a nova ordem imediatamente.

### Detalhes técnicos

**Arquivos a editar:**
- `src/components/dashboard/EditarCargaDialog.tsx`
  - Agrupar `visibleItems` por `codigo_cliente` antes de renderizar
  - Estado local `ordemEdits: Record<clienteKey, number>`
  - Handlers `moveUp`, `moveDown`, `setOrdem(clienteKey, n)`
  - Ao salvar: gerar `Record<itemId, ordem_entrega>` expandindo a ordem do cliente para todos seus itens, normalizando para 1..N
  - Estender prop `onSave` para aceitar `ordemUpdates?: Record<string, number>`
- `src/pages/Consolidado.tsx`
  - Estender `editCargaMut` para receber e aplicar `ordemUpdates` (mais um `Promise.all` paralelo aos updates de peso)
- `src/components/dashboard/AdicionarCargaDialog.tsx` — verificar se reusa o mesmo dialog; se sim, a melhoria também valerá lá (provavelmente neutro)

**Sem mudanças de schema** — coluna `ordem_entrega integer` já existe em `carregamentos_dia`.

**Sem mudanças em RLS** — política `Ops update carregamentos_dia` já cobre admin/logística/faturamento.

### Fora do escopo
- Drag-and-drop avançado em mobile (faremos se já tiver `@dnd-kit`; caso contrário fica só com setas + input, que funciona bem em mobile também).
- Re-cálculo automático de rota ótima ao reordenar manualmente (o usuário está sobrepondo a otimização de propósito).
