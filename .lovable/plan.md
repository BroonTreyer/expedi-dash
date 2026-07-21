## Objetivo
Permitir editar em lote as datas (pagamento/quitação) de todos os adiantamentos de uma linha consolidada, sem precisar abrir um por um.

## Onde aparece hoje
- Em `AdiantamentosTab.tsx`, linhas consolidadas (mais de um adiantamento agrupado por OC/Transportadora) **não** exibem o `AcoesMenu` — só o botão de comprovante. Por isso, para editar data, o usuário precisa desconsolidar/abrir cada um.
- No `ComprovanteAdiantamentoDialog.tsx`, o rodapé já tem "Desmarcar quitado/pago" em lote, mas não tem edição de datas.

## Mudanças

### 1. `AcoesMenu` também nas linhas consolidadas
- Passar o array completo `g.items` para um novo modo "lote" do `AcoesMenu`.
- No modo lote, ao clicar em "Editar data de pagamento" ou "Editar data de quitação", abrir um único date picker que aplica a data escolhida em **todos** os IDs do grupo.
- "Desmarcar quitado" / "Desmarcar pago" / "Cancelar" já funcionam com arrays — apenas habilitá-los quando todos os itens do grupo estiverem no mesmo status (senão, desabilitar com tooltip explicando).

### 2. Edição de datas em lote no `ComprovanteAdiantamentoDialog`
- Adicionar no rodapé, ao lado dos botões "Desmarcar…", dois novos:
  - "Editar data de pagamento" (visível se todos têm `pago_em`)
  - "Editar data de quitação" (visível se todos estão `quitado`)
- Cada botão abre um pequeno popover com date picker + "Aplicar a todos (N)"; usa os hooks existentes `useAtualizarDataPagamento` / `useAtualizarDataQuitacao` chamados em paralelo (`Promise.all`) para os IDs selecionados.

### 3. Hooks
Nenhum hook novo é necessário — reutilizamos:
- `useAtualizarDataPagamento({ id, pago_em })`
- `useAtualizarDataQuitacao({ id, quitado_em })`
- `useDesmarcarPago(ids[])`, `useDesmarcarQuitado(ids[])`

Opcionalmente, criar wrappers `useAtualizarDataPagamentoLote` / `useAtualizarDataQuitacaoLote` que fazem um único `UPDATE ... IN (ids)` para ser mais eficiente e gerar um único toast.

## Arquivos afetados
- `src/components/logistica/AdiantamentosTab.tsx` — habilitar `AcoesMenu` em linhas consolidadas passando `items`; suportar modo lote.
- `src/components/logistica/ComprovanteAdiantamentoDialog.tsx` — adicionar botões de editar data no rodapé.
- `src/hooks/useAdiantamentos.ts` — (opcional) adicionar os dois hooks em lote.

## Fora de escopo
- Não muda regras de status, rateio de peso, cancelamento, nem cria migration.
