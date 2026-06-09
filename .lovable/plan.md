## Objetivo
Adicionar botão "Excel" no painel amarelo de Pré-cargas do Dashboard (`PreCargasPanel`), ao lado de Finalizar/Editar/Cancelar, exportando a pré-carga individual no mesmo formato XLSX já usado na página `/precargas`.

## Mudanças

### 1. `src/components/dashboard/PreCargasPanel.tsx`
- Adicionar prop `onExportXlsx: (pc: PreCargaGroup) => void`.
- Adicionar botão `<Button variant="outline" size="sm">` com ícone `FileSpreadsheet` (lucide-react) entre "Editar" e "Cancelar", chamando `onExportXlsx(pc)`.

### 2. `src/pages/Index.tsx`
- Implementar handler `handleExportPreCarga(pc: PreCargaGroup)` que:
  - Converte `pc.items` (Carregamento[]) na estrutura `PreCargaGrupo` esperada por `exportarPreCargaUnica` — agrupando por pedido (mesma chave `numero_pedido + codigo_cliente|cliente` usada em `PreCargas.tsx`), calculando `pesoEmbarcado`/`pesoRuptura` via `pesoEfetivo`/`pesoNaoCarregado`/`temRuptura`.
  - Chama `exportarPreCargaUnica(grupo)` de `@/lib/pre-cargas-export`.
- Passar `onExportXlsx={handleExportPreCarga}` ao `<PreCargasPanel>`.

## Fora de escopo
- Não mexer no botão da página `/precargas` (já existe).
- Não criar novo formato de export — reutiliza `exportarPreCargaUnica`.
