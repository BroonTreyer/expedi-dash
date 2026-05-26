## Mudanças

### 1) Número do pedido no romaneio (1º print)

Adicionar um badge **Pedido: 12345** na linha do cliente do romaneio, ao lado dos badges `E:`, `C:` e `OC:`.

**Onde:**
- `src/components/dashboard/CargaPrintDialog.tsx` — adicionar `numerosPedido?: (string | number)[]` em `ClienteGroup` e renderizar como badge cinza igual aos demais. Se houver vários pedidos no mesmo cliente, mostrar `Pedido: 12345/12346`.
- `src/pages/Consolidado.tsx` (`handleOpenRomaneio`) — coletar os `numero_pedido` distintos por cliente (mesmo padrão já usado para `ordem_carga`) e preencher `numerosPedido`.
- `src/components/dashboard/FechamentoLoteDialog.tsx` (bloco `onPrintReady`) — `RotaGroup.items` já carrega `numeroPedido`; agregar valores distintos e enviar em `numerosPedido`.

Esses dois lugares são os únicos que constroem `CargaPrintData` (já confirmado por busca).

### 2) Data real no Consolidado (2º print)

Hoje a coluna **Data** mostra `carregamentos_dia.data` (data planejada). Vamos passar a exibir a data em que a carga foi efetivamente carregada, usando o `horario_fim` mais recente entre os itens da carga; se nenhum item tiver `horario_fim`, cai de volta para `data`.

**Onde:**
- `src/pages/Consolidado.tsx`
  - `interface CargaGroup`: adicionar `dataReal: string | null` (yyyy-MM-dd derivada do maior `horario_fim`).
  - `groupByCarga`: ao iterar os itens, calcular `MAX(horario_fim)` por grupo e gravar em `dataReal`.
  - Renderização da coluna **Data** (linhas ~1050+): exibir `group.dataReal ?? group.data` formatada em pt-BR.
  - `handleDateChange` continua editando `data` (planejada) — sem mudança no banco.

**Importante:** o filtro por intervalo de datas continua usando `data` (planejada). Não vamos alterar isso para não esconder cargas do dia esperado quando o `horario_fim` cair em outro dia. Se quiser depois inverter (filtrar por data real), basta avisar.

### Sem mudanças no schema

Tudo já está no `carregamentos_dia` (`numero_pedido`, `horario_fim`). Nenhuma migração necessária.
