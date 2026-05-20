## Diagnóstico

O peso do Raimundo (CF FRANGO / RBK7D22 — 15/05) aparece como **60.539,2 kg**, mas no banco a carga real tem **30.312,6 kg**. A diferença é exatamente o peso de outra carga antiga com o **mesmo `carga_id` "CF FRANGO"** feita em **29/04 pelo motorista Toni (placa JBM8E58)** = 30.226,6 kg.

```
15/05 — RAIMUNDO  — RBK7D22 — 28 itens — 30.312,6 kg
29/04 — TONI      — JBM8E58 — 28 itens — 30.226,6 kg
                                      ──────────────
                                Soma:    60.539,2 kg  ← o que aparece na tela
```

O carry-over de 30 dias do Consolidado (status ≠ Carregado) trouxe as duas e, na hora de agrupar, `groupByCarga` em `src/pages/Consolidado.tsx` agrupa **apenas por `carga_id`**. Como o nome "CF FRANGO" é reutilizado em cargas diferentes, as duas viagens viraram um único grupo — somando pesos, juntando itens e mostrando placa/motorista do primeiro item encontrado.

O hook `useStatusPortariaPorCarga` já trata isso usando a chave `carga_id + data + placa`; a Consolidada precisa seguir o mesmo padrão.

## Plano

**Arquivo único:** `src/pages/Consolidado.tsx`

1. **`groupByCarga` (linhas ~217-260):** trocar a chave do `Map` de `item.carga_id` para uma chave composta `${carga_id}__${data}__${placa ?? ""}`. Manter `cargaId: item.carga_id` no objeto do grupo para que filtros, links e exports continuem usando o nome amigável. Aplicar a mesma chave composta em `freteMap`.

2. **Segundo agrupamento (linhas ~469-499):** existe um segundo bloco que também agrega por `carga_id` (usado em outra visão da página). Aplicar a mesma chave composta lá.

3. **`rawGroupsBruto` → `useStatusPortariaPorCarga` (linha ~568):** já passa `{ carga_id, data, placa }`, então continua funcionando — só precisamos garantir que cada grupo carrega `placa` e `data` corretos (já carrega).

4. **Não mexer em mais nada** — KPIs, prints, exports e badges continuam consumindo `g.pesoTotal`/`g.cargaId` normalmente; só param de ver pesos somados de cargas homônimas.

## Resultado esperado

- A linha do Raimundo (19/05 — CF FRANGO — RBK7D22) passa a mostrar **30.312,6 kg**.
- A carga antiga do Toni (CF FRANGO — JBM8E58 — 29/04), se entrar no recorte da tela, aparece como uma **linha separada** com seu próprio peso, em vez de ser fundida.
- Nenhuma mudança em banco, hooks ou outras telas.
