

# Atualizar páginas de impressão com as alterações recentes

## Mudanças necessárias

### 1. CargaPrintDialog — adicionar Transportadora
- Adicionar `transportadora` ao tipo `CargaPrintData`
- Exibir no grid de informações junto com Placa, Motorista, etc.

### 2. ConsolidadoPrintDialog — adicionar Transportadora + Status
- Adicionar `transportadora` e `status` ao tipo `CargaSummary`
- Adicionar colunas "Status" (primeira posição) e "Transportadora" na tabela de impressão

### 3. Index.tsx (handlePrintCarga) — passar transportadora no print data
- Incluir `transportadora: first.transportadora ?? ""` ao montar o `CargaPrintData`

### 4. FechamentoLoteDialog — passar transportadora no onPrintReady
- O campo transportadora ainda não existe neste dialog (ele não tem), mas o `CargaPrintData` precisa aceitar string vazia

### 5. Consolidado.tsx (printData) — passar status e transportadora
- Incluir `status` e `transportadora` nos dados de cada grupo enviados ao `ConsolidadoPrintDialog`

### Arquivos editados
- `src/components/dashboard/CargaPrintDialog.tsx` — tipo + campo transportadora
- `src/components/dashboard/ConsolidadoPrintDialog.tsx` — tipo + colunas status e transportadora
- `src/pages/Index.tsx` — passar transportadora no handlePrintCarga
- `src/pages/Consolidado.tsx` — passar status e transportadora no printData

