

# Status Específicos para Rupturas + Coluna Peso/Veículo

## Mudanças

### 1. `src/lib/constants.ts`
- Adicionar array `RUPTURA_STATUSES` com: `Aguardando pedido`, `Romaneio Liberado`, `Aguardando montagem de carga`, `Aguardando Produto`
- Adicionar `RUPTURA_STATUS_COLORS` com cores distintas para cada status
- Exportar novo tipo `RupturaStatus`

### 2. `src/index.css` + `tailwind.config.ts`
- Adicionar 4 novas variáveis CSS para cores de status de ruptura (`--status-ruptura-*`)
- Registrar as cores no tailwind config

### 3. `src/components/dashboard/StatusSelect.tsx`
- Aceitar prop opcional `statuses` e `statusColors` para permitir conjunto customizado
- Quando não fornecido, usa o padrão atual (STATUSES/STATUS_COLORS)

### 4. `src/components/dashboard/CarregamentoTable.tsx`
- Aceitar prop opcional `statuses`/`statusColors` e repassar ao `StatusSelect`
- Adicionar coluna "Peso Aprox." que exibe peso convertido em TON + tipo de veículo (ex: "2,5 TON - Bitruck")

### 5. `src/pages/Rupturas.tsx`
- Passar `RUPTURA_STATUSES` e `RUPTURA_STATUS_COLORS` para `CarregamentoTable`
- Atualizar filtro de status no select para usar `RUPTURA_STATUSES`
- Ao criar novo pedido de ruptura, status default = `Aguardando pedido`
- KPI de peso exibido em TON

### 6. `src/components/dashboard/StatusBadge.tsx`
- Aceitar `statusColors` opcional para renderizar badges de ruptura corretamente no mobile

## Arquivos (6)
1. `src/lib/constants.ts` — novos arrays de status ruptura
2. `src/index.css` — variáveis CSS
3. `tailwind.config.ts` — cores tailwind
4. `src/components/dashboard/StatusSelect.tsx` — prop customizável
5. `src/components/dashboard/CarregamentoTable.tsx` — prop + coluna peso/veículo
6. `src/pages/Rupturas.tsx` — usar status de ruptura + peso em TON

