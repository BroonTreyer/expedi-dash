## Objetivo
Mostrar a **OC (Ordem de Carga)** de cada grupo de pedidos no romaneio impresso (`CargaPrintDialog`), tanto na **Sequência de Entrega** quanto na **Sequência de Carregamento**.

## Onde aparece hoje
O dialog mostra, por cliente:
`[E:1] [C:3]  26940 – BRASIL SUPREMO · Simões Filho/BA          18.005,2 kg`

## O que muda
Adicionar um badge `OC: <numero>` ao lado dos selos `E:` / `C:`, para cada grupo. Quando um grupo tiver mais de uma OC (caso raro), exibir todas separadas por `/`. Se não houver OC, simplesmente não renderiza o badge.

## Arquivos a alterar (somente UI / dados de impressão)

### 1. `src/components/dashboard/CargaPrintDialog.tsx`
- Acrescentar `ordemCarga?: string | null` na interface `ClienteGroup`.
- Renderizar, no cabeçalho de cada grupo, um badge cinza (`bg-foreground/10`) com `OC: {group.ordemCarga}` quando presente — ao lado dos atuais `E:` e `C:`.
- Sem mudanças de layout maiores; mantém o estilo print-friendly atual.

### 2. `src/pages/Consolidado.tsx` (`handleOpenRomaneio`)
- Ao montar cada `clienteGroup`, coletar as OCs distintas dos `items` daquele cliente (`Array.from(new Set(items.map(i => i.ordem_carga).filter(Boolean))).join("/")`) e atribuir em `ordemCarga`.
- Isto garante o número correto mesmo no modo "OC por grupo" do fechamento em lote.

### 3. `src/components/dashboard/FechamentoLoteDialog.tsx` (bloco `onPrintReady`)
- Ao montar cada item de `groups`, calcular a OC efetiva do grupo:
  - Se `modoOc === "porGrupo"` → `ordemCargaPorGrupo[groupKey]?.trim()`
  - Caso contrário → `ordemCarga.trim()`
- Passar como `ordemCarga` no objeto enviado ao `CargaPrintData`.

## Fora de escopo
- Sem mudanças de banco, RLS, hooks ou lógica de submit.
- Sem mudanças no `ConsolidadoPrintDialog` (relatório consolidado de cargas) — pediu apenas no romaneio por carga.
