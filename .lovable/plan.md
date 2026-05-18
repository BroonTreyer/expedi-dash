## Objetivo

Adicionar, em cada card de pré-carga na tela `/pre-cargas`, um botão "Baixar PDF" que abre um diálogo de impressão (gerar PDF via "Imprimir") com o resumo da pré-carga e todas as rupturas dos pedidos.

## O que o PDF traz

Cabeçalho:
- Logo Frico + título "Pré-carga — [nome_carga ou carga_id]"
- Data da carga (dd/MM/aaaa)
- Linha de identificação: placa, motorista, transportadora, tipo de caminhão, ordem de carga, destinos

Resumo (KPIs):
- Qtd pedidos
- Peso total planejado (embarcado + ruptura)
- Peso embarcado
- Peso em ruptura + qtd de itens em ruptura

Tabela "Pedidos":
- Pedido · Cliente (código) · Cidade/UF · Peso embarcado · Peso em ruptura

Tabela "Rupturas detalhadas" (somente itens com ruptura total ou parcial):
- Pedido · Cliente · Código · Produto · Tipo (Total/Parcial) · Peso original · Carregado · Diferença · Motivo

Rodapé com totais.

## Implementação técnica

1. Criar `src/components/precargas/PreCargaPrintDialog.tsx`:
   - Mesmo padrão de impressão do `RupturasPrintDialog` (id `rupturas-print-content` → `carga-print-root`, `printing-carga`, `window.print()`).
   - Recebe `carga: PreCargaGrupo` via props.
   - Calcula listas/itens usando `temRuptura`, `pesoEfetivo`, `pesoNaoCarregado`.

2. Em `src/pages/PreCargas.tsx`:
   - Adicionar estado `printCarga: PreCargaGrupo | null`.
   - No header do `PreCargaCard` (ao lado do resumo de peso), adicionar `<Button variant="outline" size="sm">` com ícone `FileDown`/`Printer` → chama `onPrint(carga)`.
   - Renderizar `<PreCargaPrintDialog open={!!printCarga} ... carga={printCarga} />`.

3. Reutilizar o CSS de impressão já existente (`printing-carga` em `index.css`) — nenhum CSS novo necessário.

## Arquivos alterados/criados

- Novo: `src/components/precargas/PreCargaPrintDialog.tsx`
- Editado: `src/pages/PreCargas.tsx` (botão + estado + render do diálogo)
