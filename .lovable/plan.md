## Problema

Ao gerar adiantamentos para várias transportadoras de uma vez, só o **comprovante/mensagem do primeiro** é exibido (`setComprovanteAdt(criados[0])`). Os demais ficam invisíveis — o usuário precisaria abrir um por um na lista.

Além disso, o template da mensagem em `ComprovanteAdiantamentoDialog` já é numerado (`1.{transportadora}...`), sugerindo que o desenho original previa **uma única mensagem consolidada** com várias transportadoras.

## Correção

### 1. `ComprovanteAdiantamentoDialog.tsx` — aceitar múltiplos adiantamentos
- Mudar a prop de `adiantamento: Adiantamento | null` para `adiantamentos: Adiantamento[]` (manter compat aceitando array de 1).
- Buscar os CT-es de cada adiantamento (loop de hooks → criar componente interno `BlocoTransportadora` que chama `useAdiantamentoCtes` para um id, para respeitar regras de hooks).
- Montar a mensagem consolidada:

  ```
  ADIANTAMENTO DE FRETE CIF, FORA DO ESTADO.

  1.{Transp A} ({peso} Kg) CTE
  {numeros}
  *VLR {valor}*

  2.{Transp B} ({peso} Kg) CTE
  {numeros}
  *VLR {valor}*

  *Valor Total do Frete {soma}*

  {%}% de Adiantamento

  *{soma adiantamento}*

  Código X – Transp A
  Pix: ...
  Código Y – Transp B
  Pix: ...
  ```
  
  Quando os percentuais diferirem entre transportadoras, exibir o adiantamento por bloco (em vez de um total único).
- Título do dialog: `Comprovante — N adiantamentos` (ou número único quando for 1).
- Botão "Marcar como pago" passa a marcar **todos** os pendentes (loop `marcarPago.mutateAsync`).

### 2. `AdiantamentosTab.tsx` — passar a lista
- Trocar `comprovanteAdt: Adiantamento | null` por `comprovantesAdt: Adiantamento[]`.
- Em `handleGerar`, após o loop: `setComprovantesAdt(criados)` em vez de `criados[0]`.
- No clique de "Comprovante" da lista existente (`ListaAdiantamentos`), continuar abrindo com `[adiantamento]`.

Nada muda no schema ou nos hooks — apenas frontend/apresentação.
