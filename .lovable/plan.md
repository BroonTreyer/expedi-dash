

## Imprimir romaneio individual a partir do Consolidado

### O que muda

Hoje na página **Consolidado** o botão "Imprimir" gera o `ConsolidadoPrintDialog` — um relatório resumo de várias cargas em uma linha cada (status, placa, motorista, peso total). Você quer poder, **na linha de cada carga**, abrir o **mesmo romaneio detalhado** que aparece no fechamento (clientes em ordem de entrega + ordem de carregamento, peso por cliente, rupturas riscadas) — ou seja, o `CargaPrintDialog` que já existe.

### Solução

Adicionar um botão **"Romaneio"** (ícone `Printer` ou `FileText`) em cada linha/card de carga no `Consolidado.tsx`, ao lado dos botões já existentes (Editar, Inverter ordem, etc.). Ao clicar, monta o `CargaPrintData` daquela carga específica (agrupando por cliente, ordenando por `ordem_entrega`, calculando peso efetivo via `peso-utils`, marcando rupturas) e abre o `CargaPrintDialog` já existente — exatamente o mesmo componente usado em Fechar Carga, então a visualização é idêntica (com E:/C: lado a lado, legenda, totais, rupturas riscadas).

### Mudanças concretas

- ✏️ `src/pages/Consolidado.tsx`:
  - Importar `CargaPrintDialog` e tipo `CargaPrintData`.
  - Adicionar estado `printCargaData: CargaPrintData | null` e `printOpen: boolean`.
  - Helper `buildCargaPrintData(carga)` que: agrupa pedidos da carga por `codigo_cliente`+`nome_cliente`, ordena por `ordem_entrega`, calcula `pesoTotal` por cliente usando peso efetivo (ignorando rupturas no total mas listando-as como riscadas), monta header com data, tipo caminhão, placa, motorista, transportadora.
  - Botão **"Romaneio"** em cada carga (mesmo bloco onde estão Editar/Inverter), que chama o helper e abre o dialog.
  - Renderizar `<CargaPrintDialog open={printOpen} onOpenChange={setPrintOpen} data={printCargaData} />` no final do componente.

- ✏️ Opcional: o botão atual "Imprimir" (relatório consolidado) continua igual, sem mudança — fica como visão macro. O novo botão "Romaneio" é a visão micro de uma carga.

### O que NÃO muda

- `CargaPrintDialog.tsx` continua igual — reaproveitamento total.
- `ConsolidadoPrintDialog` continua igual.
- Sem migration, sem mexer em hooks de dados (a página já carrega os pedidos completos de cada carga).
- Lógica de peso efetivo e rupturas vem de `peso-utils`, igual ao Fechamento.

