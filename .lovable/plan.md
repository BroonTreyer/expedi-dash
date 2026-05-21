## Problema

No painel principal, quando você seleciona pedidos e clica em **"Add Carga"**, o diálogo lista todas as cargas existentes — inclusive **pré-cargas (PRE-...)**. Mas a lógica de adicionar **sempre marca os pedidos como `etapa = "logistica"`** (carga fechada), além de **não copiar** `nome_carga`, `ordem_carga`, `data` e `transportadora` da pré-carga selecionada.

Resultado: os pedidos recebem o `carga_id` da pré-carga, mas como ficam em `etapa = logistica`, o painel de Pré-cargas (`usePreCargas`, que filtra `etapa = 'pre_carga'`) **não os exibe junto da pré-carga**. Eles "somem" da pré-carga, embora estejam vinculados a ela no banco.

Arquivos envolvidos:
- `src/components/dashboard/AdicionarCargaDialog.tsx` — hard-coded `etapa: "logistica"`.
- `src/pages/Index.tsx` — monta `cargasFechadas` sem distinguir pré-carga de carga fechada e sem expor os campos extras (`nome_carga`, `ordem_carga`, `data`, `transportadora`, `etapa`).

## O que vou fazer

1. **`CargaResumo` ganha campos novos**: `etapa`, `nomeCarga`, `ordemCarga`, `data`, `transportadora`. Em `Index.tsx`, preencher esses campos a partir do primeiro item de cada `carga_id`.

2. **`AdicionarCargaDialog`** passa a:
   - Mostrar visualmente quando a opção é uma **pré-carga** (badge "Pré-carga" ao lado do nome).
   - Ao confirmar, se o destino for pré-carga (`etapa === "pre_carga"` ou `cargaId` começa com `PRE-`), aplicar nos pedidos:
     - `etapa: "pre_carga"` (em vez de `"logistica"`)
     - `nome_carga`, `ordem_carga`, `data`, `transportadora` herdados da pré-carga
   - Caso contrário, comportamento atual (`etapa: "logistica"`).

3. **`handleAdicionarCargaSubmit`** em `Index.tsx` aceita os campos extras no payload e os repassa ao `batchUpdateMut`. Mensagem do toast diferencia "adicionado(s) à pré-carga X" vs "adicionado(s) à carga X".

Nenhuma migração de banco. Nenhuma mudança no fluxo de "Fechar Carga", "Salvar Pré-carga" ou cancelamento.

## Verificação

Após a mudança, ao selecionar pedidos no painel principal → "Add Carga" → escolher uma `PRE-...`, os pedidos devem aparecer **imediatamente dentro daquela pré-carga** no painel "Pré-cargas" (mesmo nome, mesma data, mesma OC), e **sumir do painel principal** (porque pré-cargas são filtradas em `filtered`). Pedidos adicionados a uma carga fechada (`CG-...`) continuam indo para `logistica` como hoje.
