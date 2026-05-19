## Problema

Na Portaria — Distribuidores, o badge da aba **Pátio** mostra `2`, mas a lista "Veículos no Pátio" aparece vazia ("Nenhum veículo no pátio").

## Causa raiz

Os 2 veículos em questão (`RBK7D22 / CF FRANGO` e `TMX7J57 / LACTOFRIOS`) estão na situação:
- `categoria = 'terceirizado'`, `etapa_terceirizado = 'chegada'`
- têm `carga_id` e `horario_chegada` preenchidos
- **não** têm `horario_entrada` (ainda não liberados para o pátio físico)

Eles aparecem corretamente no painel azul **"Cargas fechadas aguardando veículo"** no topo da página (aguardando o gatehouse clicar em "Liberar entrada no pátio").

Mas há uma divergência entre dois filtros:

- **Contador** (`src/pages/Portaria.tsx`, `counts.patio`): exclui apenas terceirizado em `chegada` **sem `carga_id`** — então conta esses 2.
- **Lista** (`src/components/portaria/PatioAtualTab.tsx`, linha 139): exclui qualquer entrada com `horario_chegada && !horario_entrada` que não seja "aguardando vínculo" — esconde esses 2.

Resultado: badge diz "2", lista vazia.

## Correção

Alinhar `counts.patio` em `src/pages/Portaria.tsx` com a regra real da lista — ou seja, contar como "no pátio" somente:

1. Entradas com `horario_entrada` preenchido (efetivamente liberadas), **OU**
2. Terceirizado em `chegada` **sem** `carga_id` (cards vermelhos "Aguardando vínculo"), **OU**
3. Carga própria nas etapas `em_rota` / `retornou` (3-stage legado).

E continuar excluindo as finalizadas e as que já têm saída vinculada.

Os "chegada com `carga_id` aguardando liberação" deixam de contar no badge do Pátio — eles já estão visíveis e contados no painel azul "Cargas fechadas aguardando veículo".

## Detalhes técnicos

Arquivo único alterado: `src/pages/Portaria.tsx`, bloco `counts` (linhas ~111-126). Substituir o cálculo de `patio` por algo equivalente a:

```ts
const patio = movimentacoesAtivasPatio.filter((m) => {
  // já saiu
  if (saidasVinculadas.has(m.id)) return false;
  // carga própria legado em rota/retorno
  if (m.categoria === "carga_propria" && m.tipo_movimento === "saida" && m.etapa_carga_propria) {
    return m.etapa_carga_propria !== "finalizado";
  }
  if (m.tipo_movimento !== "entrada") return false;
  if (m.categoria === "terceirizado" && m.etapa_terceirizado === "finalizado") return false;
  if (m.categoria === "carga_propria" && m.etapa_carga_propria === "finalizado") return false;
  // terceirizado aguardando vínculo (vermelho) — conta
  const aguardandoVinculo =
    m.categoria === "terceirizado" && m.etapa_terceirizado === "chegada" && !m.carga_id;
  if (aguardandoVinculo) return true;
  // chegada sem entrada física → fica no painel azul, não conta
  if (m.horario_chegada && !m.horario_entrada) return false;
  return true;
}).length;
```

Nenhuma alteração em hooks, RLS, banco ou outros componentes. Lógica do `PatioAtualTab` permanece como está.

## Verificação

Após o ajuste, a aba **Pátio** em `/portaria/terceirizado` deve exibir **0** (com a lista vazia coerente), e os 2 cards continuam aparecendo no painel azul "Cargas fechadas aguardando veículo" no topo, prontos para liberação.
