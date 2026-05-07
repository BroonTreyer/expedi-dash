## Objetivo

1. Renomear, em Logística → Gastos por Vendedor, os rótulos **"Previsto"** → **"Tabela"** e **"Realizado (CT-e)"** → **"Valor do CT-e"**, com explicação clara da diferença.
2. Na aba **CT-es / DACTE**, agrupar os CT-es importados em lote por **Ordem de Carga**, mostrando um resumo por OC (em vez de uma linha por CT-e).

---

## 1) Renomear "Previsto" / "Realizado" e adicionar legenda

Arquivo: `src/components/logistica/GastosVendedorTab.tsx`

- KPIs (linhas 102–109):
  - "Previsto" → **"Tabela"**
  - "Realizado (CT-e)" → **"Valor do CT-e"**
  - "Divergência" mantém, mas o `sub` passa a ser `"Valor CT-e − Tabela"`.
- Cabeçalhos da tabela (linhas 128–129): "Previsto" → "Tabela"; "Realizado" → "Valor do CT-e".
- Detalhes expandidos (linhas 207, 209): mesmos rótulos.
- Adicionar abaixo dos KPIs um pequeno bloco explicativo (ícone `Info`):
  > **Tabela**: valor calculado pela tabela de frete cadastrada (R$/kg × peso por destino, conforme tipo de caminhão).
  > **Valor do CT-e**: valor efetivamente cobrado pela transportadora, lido dos DACTEs importados.
  > **Divergência**: `Valor do CT-e − Tabela` (positivo = cobrado a mais que a tabela).

Os mesmos rótulos no card "Pedidos consolidados deste vendedor na carga" (Cargas em Andamento do Vendedor — imagem enviada) também serão atualizados onde aparecerem "Previsto/Realizado" referindo-se a frete. Vou checar `CargasAndamentoVendedor.tsx` e ajustar lá também caso use os mesmos rótulos.

## 2) Agrupar CT-es por Ordem de Carga na aba CT-es / DACTE

Arquivo: `src/components/logistica/CtesDacteTab.tsx`

Hoje a aba lista **uma linha por CT-e**. Quando se sobe um lote (ex.: OC 129206 com 8+ CT-es), fica poluído.

Nova estrutura:

- Adicionar **toggle** no topo: `[ Por Ordem de Carga ] [ Lista (CT-e a CT-e) ]` (default = Por OC).
- No modo **Por OC**, agrupar `data` por `ordem_carga` (CT-es sem OC vão para um grupo "Sem ordem"):
  - Linha-resumo por OC mostrando:
    - `OC <numero>` + nome da carga (se disponível via `carga_id` join — usaremos o que já vem em `ordem_carga` direto, e buscaremos `nome_carga` via lookup quando `carga_id` existir).
    - Transportadora (consolidada; se >1 mostra "vários").
    - Placa (idem).
    - Destinos (lista única "BARREIRAS/BA, CORRENTE/PI").
    - Qtd de CT-es.
    - **Peso total (kg)**.
    - **Frete total (R$)**.
    - Status agregado: `vinculado` se todos vinculados; `divergente` se algum divergente; senão `pendente`.
  - Linha expansível (▶) revela a tabela atual com todos os CT-es daquela OC (mesmo conteúdo de hoje), para auditoria, com botões de PDF e excluir individuais.
  - **Excluir OC inteira**: botão na linha-resumo que apaga em lote todos os CT-es daquela OC (com `confirm`).
- No modo **Lista**, mantém o comportamento atual.

Implementação:
- `useMemo` para criar `Map<ordemCarga, { ctes: CteDacteRow[], peso, frete, transportadoras: Set, placas: Set, destinos: Set, status }>` a partir de `filtered`.
- Estado `viewMode: "ordem" | "lista"` e `expanded: Set<string>`.
- Mutação adicional `useDeleteCtesByOrdem` (ou reutilizar `useDeleteCteDacte` em loop) para apagar em lote — preferir um único `delete().in('id', ids)` para ser uma chamada só. Adicionar isso em `useCtesDacte.ts`.
- Filtro de busca continua funcionando: o agrupamento é feito **depois** do `filtered`, então buscar por OC/CT-e/destino reduz os grupos automaticamente.

## Resumo das alterações de arquivos

- `src/components/logistica/GastosVendedorTab.tsx` — renomear rótulos + bloco explicativo.
- `src/components/vendedor/CargasAndamentoVendedor.tsx` — renomear rótulos equivalentes (se existirem).
- `src/components/logistica/CtesDacteTab.tsx` — toggle de visualização + agrupamento por OC + exclusão em lote.
- `src/hooks/useCtesDacte.ts` — adicionar `useDeleteCtesByIds(ids[])` para excluir um grupo de CT-es.

Sem mudanças de banco, sem migrations.