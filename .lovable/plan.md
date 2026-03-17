

# Impressão para Consolidado e Rupturas

## Objetivo
Adicionar botão de impressão/PDF nas páginas Consolidado e Rupturas, reutilizando a mesma estratégia de clone+print do `CargaPrintDialog` existente, mas com layouts específicos para cada contexto.

## O que será criado

### 1. Componente `ConsolidadoPrintDialog`
- Dialog com preview do relatório e botão "Imprimir / PDF"
- Layout com logo Fricó, data, filtros aplicados
- Tabela resumo por veículo: Carga ID, Tipo, Placa, Motorista, Peso, Pedidos, Clientes
- Rodapé com totais (veículos, peso total, pedidos)
- Mesma técnica de clone para `#carga-print-root` + `body.printing-carga`

### 2. Componente `RupturasPrintDialog`
- Dialog com preview do relatório e botão "Imprimir / PDF"
- Layout com logo Fricó, data, filtros aplicados
- Tabela "Resumo por Produto" (código, produto, qtd rupturas, peso)
- Lista detalhada das rupturas (pedido, produto, cliente, vendedor, peso)
- Rodapé com totais

### 3. Integração nas páginas

**Consolidado (`src/pages/Consolidado.tsx`)**:
- Botão "Imprimir" no header ao lado do título
- State para controlar o dialog
- Montar dados de impressão a partir dos `groups` já calculados

**Rupturas (`src/pages/Rupturas.tsx`)**:
- Botão "Imprimir" no header (ao lado do botão "Novo Pedido")
- State para controlar o dialog
- Montar dados a partir dos `rupturas` e `productSummary` já calculados

## Arquivos
- **Novo**: `src/components/dashboard/ConsolidadoPrintDialog.tsx`
- **Novo**: `src/components/dashboard/RupturasPrintDialog.tsx`
- **Editar**: `src/pages/Consolidado.tsx` (botão + dialog)
- **Editar**: `src/pages/Rupturas.tsx` (botão + dialog)

## Reutilização
- Mesma CSS `@media print` já existente em `index.css` (classe `printing-carga`, container `#carga-print-root`)
- Mesma técnica de `cloneNode` + `afterprint` cleanup do `CargaPrintDialog`
- Logo Fricó importado de `@/assets/frico-logo.png`

