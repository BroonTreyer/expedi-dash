## Problema

Fagno (registro `3ab3d485-e833-4568-8157-5117b86a77a6`, placa QWE1B20, terceirizado, etapa `chegada`, criado em 12/05 11:33 sem `carga_id` e sem `horario_entrada`) sumiu do Pátio Atual hoje. Ontem ele aparecia como card vermelho "Aguardando vínculo".

Em `src/components/portaria/PatioAtualTab.tsx` o filtro de `veiculosNoPatio` tem dois trechos conflitantes:

- Linha 136: `if (m.horario_chegada && !m.horario_entrada) return false;` — remove qualquer chegada sem entrada física, **incluindo terceirizados em `chegada` sem carga**.
- Linhas 139-142 (comentário): "Terceirizado em 'chegada' SEM carga vinculada permanece visível aqui em destaque vermelho" — intenção declarada, mas inalcançável porque o filtro anterior já excluiu o registro.

A regra do filtro 136 foi criada para evitar duplicação com o painel azul "Cargas fechadas aguardando veículo", que mostra entradas com `carga_id` vinculado. Terceirizado em `chegada` **sem** `carga_id` não aparece no painel azul (não há carga para vincular), então não há duplicação a temer — ele deve ficar no Pátio Atual como card vermelho.

## Correção

Em `src/components/portaria/PatioAtualTab.tsx`, ajustar a linha 136 para abrir uma exceção a terceirizado em `chegada` sem `carga_id`:

```ts
// Chegada registrada mas sem entrada física no pátio fica no painel azul,
// EXCETO terceirizado em "chegada" sem carga vinculada — esse permanece
// aqui em vermelho ("Aguardando vínculo"), porque o painel azul só lista
// chegadas COM carga_id.
const isTerceirizadoAguardandoVinculo =
  m.categoria === "terceirizado" &&
  m.etapa_terceirizado === "chegada" &&
  !m.carga_id;
if (m.horario_chegada && !m.horario_entrada && !isTerceirizadoAguardandoVinculo) return false;
```

Mantém a deduplicação para carga própria/terceirizado com carga vinculada e devolve o card vermelho do Fagno (e qualquer caso similar).

## Arquivos alterados

- `src/components/portaria/PatioAtualTab.tsx` — uma linha de filtro em `veiculosNoPatio`.

## Validação

1. Recarregar `/portaria` → Pátio Atual deve mostrar o card vermelho do Fagno (placa QWE1B20) no topo da lista, com botão "Vincular carga".
2. Vincular uma carga ao Fagno → ele migra para o estado normal (libera entrada) e o card vermelho some.
3. Conferir que terceirizados COM `carga_id` aguardando liberação continuam aparecendo no painel azul "Cargas fechadas aguardando veículo" e não duplicam no Pátio Atual.
