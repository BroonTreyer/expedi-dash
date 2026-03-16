

# Reimprimir Romaneio de Cargas já Fechadas

## O que será feito

Adicionar um botão "Imprimir Romaneio" (ícone de impressora) na tabela, ao lado do botão "Desfazer Carga", para pedidos que já possuem `carga_id`. Ao clicar, o sistema busca todos os pedidos daquela carga, monta os dados agrupados por cliente e abre o `CargaPrintDialog` existente.

## Arquivos editados

### `src/components/dashboard/CarregamentoTable.tsx`
- Adicionar prop `onPrintCarga?: (cargaId: string) => void`
- Adicionar botão com ícone `Printer` ao lado do botão de desfazer, visível quando `c.carga_id` existe (para admin e logística)
- Aplicar tanto na linha simples (single item) quanto na linha de grupo (multi-item)

### `src/pages/Index.tsx`
- Criar handler `handlePrintCarga(cargaId: string)` que:
  1. Filtra `carregamentos` pelo `carga_id`
  2. Agrupa por `codigo_cliente` (mesma lógica do FechamentoLoteDialog)
  3. Extrai `tipoCaminhao`, `placa`, `motorista`, `horarioPrevisto` do primeiro item
  4. Monta o objeto `CargaPrintData` e abre o `CargaPrintDialog`
- Passar `onPrintCarga` para `CarregamentoTable`

Nenhuma mudança no banco de dados. Reutiliza o `CargaPrintDialog` existente.

