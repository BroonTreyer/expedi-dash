## Problema

Na aba **Portaria → Carga Própria**, está aparecendo o veículo do **Célio** (motorista da JR Transportes — terceirizado). Ele deveria estar apenas na aba **Terceirizado**.

## Causa

No hook `useCargasFechadasAguardando` (`src/hooks/useCarregamentos.ts`, linhas 556-571), o agrupamento usa **apenas `carga_id`** como chave (`grouped.set(c.carga_id, ...)`).

Hoje há duas cargas distintas reusando o mesmo `carga_id = "JR"`:

| carga_id | data       | motorista | placa    | transportadora |
|----------|------------|-----------|----------|----------------|
| JR       | 2026-04-27 | Fagno     | QWE1B20  | JR TRANSPORTES |
| JR       | 2026-05-02 | Célio     | RSB1H70  | JR TRANSPORTES |

Como o agrupamento usa só `carga_id`, as duas viagens viram **um único item** no painel. Os campos `placa`, `motorista`, `transportadora` ficam fixos com os dados da **primeira linha** que entrar no Map. Quando uma das viagens ainda não tem `transportadora` preenchida em todos os itens (ex.: linha mais antiga sem o campo), o item agrupado pode ficar `transportadora = null`, e o filtro `isPropria = !c.transportadora` em `CargasFechadasAguardandoPanel.tsx:51` o classifica como **carga própria** → Célio aparece no lugar errado.

## Correção

**Arquivo único: `src/hooks/useCarregamentos.ts`** — alterar a chave de agrupamento em `useCargasFechadasAguardando` para distinguir viagens diferentes que reusam o mesmo `carga_id`:

1. Trocar a chave do `grouped` Map de `c.carga_id` para uma chave composta:
   ```ts
   const groupKey = `${c.carga_id}|${(c.placa || "").trim().toUpperCase()}|${c.data}`;
   ```

2. Aplicar a mesma chave composta no fallback de busca de `entradaPorCarga`: hoje a entrada é buscada por `carga_id` puro, mas com a nova lógica precisa cruzar **carga_id + placa** com a movimentação correspondente (já há filtro de janela de data e placa nas movimentações nas linhas 530-538, então basta usar `placaCarga` para resolver a entrada certa).

3. Manter a interface `CargaFechadaAguardando` igual — o que muda é só o agrupamento interno.

## Resultado esperado

- Célio (RSB1H70 / JR TRANSPORTES) e Fagno (QWE1B20 / JR TRANSPORTES) viram **dois itens separados** no painel.
- Ambos passam o filtro `!isPropria` → aparecem só na aba **Terceirizado**.
- A aba **Carga Própria** fica limpa de veículos terceirizados.
- Não mexe em nenhum outro fluxo (Esperados, Pátio, Histórico) — apenas refina o agrupamento de cargas que reusam `carga_id`.

## Impacto

- 1 arquivo, sem migração de banco, sem mudança de RLS.
- Compatível com cargas que **não** reusam `carga_id` (a chave composta segue única para elas).
- Resolve também outros casos invisíveis em que cargas distintas com mesmo nome se fundiam no painel (peso/qtd somados errado).
